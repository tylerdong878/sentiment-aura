export type PcmStreamer = {
  start: () => Promise<void>;
  stop: () => void;
  isRecording: () => boolean;
};

type Options = {
  onPcm?: (int16Buffer: ArrayBuffer) => void;
  targetSampleRate?: number; // default 16000
};

export function createPcmStreamer(options: Options = {}): PcmStreamer {
  let audioCtx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let stream: MediaStream | null = null;
  let recording = false;

  const targetRate = options.targetSampleRate ?? 16000;

  function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
    if (outputSampleRate === inputSampleRate) {
      return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  function floatTo16BitPCM(float32: Float32Array) {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  const start = async () => {
    if (recording) return;
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(stream);
    try {
      // Prefer AudioWorklet if available
      // Note: Vite supports loading via module URL
      // @ts-ignore
      await audioCtx.audioWorklet.addModule(new URL('../worklets/pcm-processor.js', import.meta.url));
      workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
      workletNode.port.onmessage = (ev) => {
        const chunk = ev.data as Float32Array;
        const down = downsampleBuffer(chunk, audioCtx!.sampleRate, targetRate);
        const int16 = floatTo16BitPCM(down);
        options.onPcm?.(int16);
      };
      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);
    } catch {
      // Fallback: ScriptProcessorNode
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const down = downsampleBuffer(input, audioCtx!.sampleRate, targetRate);
        const int16 = floatTo16BitPCM(down);
        options.onPcm?.(int16);
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
    }
    recording = true;
  };

  const stop = () => {
    if (!recording) return;
    try { processor?.disconnect(); } catch {}
    try { workletNode?.disconnect(); } catch {}
    source?.disconnect();
    try { audioCtx?.close(); } catch {}
    stream?.getTracks().forEach((t) => t.stop());
    processor = null;
    workletNode = null;
    source = null;
    audioCtx = null;
    stream = null;
    recording = false;
  };

  return {
    start,
    stop,
    isRecording: () => recording,
  };
}


