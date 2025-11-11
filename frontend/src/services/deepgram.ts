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

  constructor(options: DeepgramClientOptions) {
    this.options = options;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.openPromise ?? Promise.resolve();
    }
    const sampleRate = this.options.sampleRate ?? 48000;
    const encoding = this.options.encoding ?? 'opus';
    const token = this.options.apiKey;
    // Use Deepgram token via subprotocols (recommended for browsers)
    const url = `wss://api.deepgram.com/v1/listen?encoding=${encoding}&sample_rate=${sampleRate}&vad_turnoff=2000&model=nova-2&punctuate=true`;
    this.ws = new WebSocket(url, ['token', token]);
    this.openPromise = new Promise<void>((resolve) => (this.resolveOpen = resolve));
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      this.options.onOpen?.();
      this.resolveOpen?.();
    };
    this.ws.onclose = (ev) => {
      this.options.onClose?.(ev.code, ev.reason);
      this.ws = null;
      this.openPromise = null;
      this.resolveOpen = null;
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

  async sendAudioChunk(blob: Blob) {
    if (!this.ws) return;
    if (this.ws.readyState === WebSocket.CONNECTING) {
      await this.openPromise;
    }
    if (this.ws.readyState !== WebSocket.OPEN) return;
    const buf = await blob.arrayBuffer();
    this.ws.send(buf);
  }

  close() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close(1000, 'client-close');
    }
  }
}


