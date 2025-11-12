type DeepgramClientOptions = {
  apiKey: string;
  sampleRate?: number;
  encoding?: 'opus' | 'linear16';
  onTranscript?: (text: string, isFinal: boolean) => void;
  onOpen?: () => void;
  onClose?: (code?: number, reason?: string) => void;
  onError?: (e: Event) => void;
};

export class DeepgramRealtimeClient {
  private ws: WebSocket | null = null;
  private openPromise: Promise<void> | null = null;
  private resolveOpen: (() => void) | null = null;
  private options: DeepgramClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = false;

  constructor(options: DeepgramClientOptions) {
    this.options = options;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.openPromise ?? Promise.resolve();
    }
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    return this._connect();
  }

  private _connect(): Promise<void> {
    const sampleRate = this.options.sampleRate ?? 16000;
    const encoding = this.options.encoding ?? 'linear16';
    const token = this.options.apiKey;
    // Use Deepgram token via subprotocols (recommended for browsers)
    const url = `wss://api.deepgram.com/v1/listen?encoding=${encoding}&sample_rate=${sampleRate}&vad_turnoff=2000&model=nova-2&punctuate=true`;
    this.ws = new WebSocket(url, ['token', token]);
    this.openPromise = new Promise<void>((resolve) => (this.resolveOpen = resolve));
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.options.onOpen?.();
      this.resolveOpen?.();
    };
    this.ws.onclose = (ev) => {
      this.options.onClose?.(ev.code, ev.reason);
      this.ws = null;
      this.openPromise = null;
      this.resolveOpen = null;
      
      // Attempt reconnection if we should and haven't exceeded max attempts
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        this.reconnectDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
        this.reconnectTimer = setTimeout(() => {
          console.log(`Reconnecting to Deepgram (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          this._connect();
        }, this.reconnectDelay);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please restart recording.');
      }
    };
    this.ws.onerror = (e) => {
      this.options.onError?.(e);
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
        // Deepgram message shape: { channel: { alternatives: [{ transcript: string }], ... }, is_final: boolean }
        const alt = msg?.channel?.alternatives?.[0];
        const transcript: string = alt?.transcript ?? '';
        const isFinal: boolean = !!msg?.is_final;
        if (transcript) {
          this.options.onTranscript?.(transcript, isFinal);
        }
      } catch {
        // Ignore non-JSON messages (e.g., pings)
      }
    };
    return this.openPromise;
  }

  async sendAudioChunk(data: Blob | ArrayBuffer) {
    if (!this.ws) return;
    if (this.ws.readyState === WebSocket.CONNECTING) {
      await this.openPromise;
    }
    if (this.ws.readyState !== WebSocket.OPEN) return;
    const buf = data instanceof Blob ? await data.arrayBuffer() : data;
    this.ws.send(buf);
  }

  close() {
    this.shouldReconnect = false; // Prevent reconnection when manually closed
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close(1000, 'client-close');
    }
  }
}


