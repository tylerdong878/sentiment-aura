export type AudioStreamController = {
  start: () => Promise<void>;
  stop: () => void;
  isRecording: () => boolean;
};

type Options = {
  onData?: (chunk: Blob) => void;
  onStop?: () => void;
  mimeType?: string;
  timesliceMs?: number;
};

export function createAudioRecorder(options: Options = {}): AudioStreamController {
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let recording = false;

  const start = async () => {
    if (recording) return;
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = options.mimeType ?? 'audio/webm;codecs=opus';
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        options.onData?.(e.data);
      }
    };
    mediaRecorder.onstop = () => {
      options.onStop?.();
    };
    mediaRecorder.start(options.timesliceMs ?? 250);
    recording = true;
  };

  const stop = () => {
    if (!recording) return;
    mediaRecorder?.stop();
    mediaStream?.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
    mediaStream = null;
    recording = false;
  };

  return {
    start,
    stop,
    isRecording: () => recording,
  };
}


