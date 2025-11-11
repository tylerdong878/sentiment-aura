import { create } from 'zustand';

type AuraState = {
  sentimentScore: number;
  sentimentLabel: string;
  energy: number;
  keywords: string[];
  transcript: string[];
  addTranscript: (chunk: string) => void;
  setAnalysis: (p: { sentimentScore: number; sentimentLabel: string; energy: number; keywords: string[] }) => void;
};

const useAuraStore = create<AuraState>((set) => ({
  sentimentScore: 0.5,
  sentimentLabel: 'neutral',
  energy: 0.3,
  keywords: [],
  transcript: [],
  addTranscript: (chunk) => set((s) => ({ transcript: [...s.transcript, chunk] })),
  setAnalysis: ({ sentimentScore, sentimentLabel, energy, keywords }) =>
    set(() => ({ sentimentScore, sentimentLabel, energy, keywords })),
}));

export default useAuraStore;


