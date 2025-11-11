import { create } from 'zustand';

type AuraState = {
  sentimentScore: number;
  sentimentLabel: string;
  energy: number;
  keywords: string[];
  transcript: string[];
  interimTranscript: string;
  deepgramConnected: boolean;
  lastAnalysisAt: number | null;
  addTranscript: (chunk: string) => void;
  setAnalysis: (p: { sentimentScore: number; sentimentLabel: string; energy: number; keywords: string[] }) => void;
  setInterim: (text: string) => void;
  clearInterim: () => void;
  setDeepgramConnected: (v: boolean) => void;
  setLastAnalysisNow: () => void;
};

const useAuraStore = create<AuraState>((set) => ({
  sentimentScore: 0.5,
  sentimentLabel: 'neutral',
  energy: 0.3,
  keywords: [],
  transcript: [],
  interimTranscript: '',
  deepgramConnected: false,
  lastAnalysisAt: null,
  addTranscript: (chunk) => set((s) => ({ transcript: [...s.transcript, chunk] })),
  setAnalysis: ({ sentimentScore, sentimentLabel, energy, keywords }) =>
    set(() => ({ sentimentScore, sentimentLabel, energy, keywords })),
  setInterim: (text) => set(() => ({ interimTranscript: text })),
  clearInterim: () => set(() => ({ interimTranscript: '' })),
  setDeepgramConnected: (v) => set(() => ({ deepgramConnected: v })),
  setLastAnalysisNow: () => set(() => ({ lastAnalysisAt: Date.now() })),
}));

export default useAuraStore;


