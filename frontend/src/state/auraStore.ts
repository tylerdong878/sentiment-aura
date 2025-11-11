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
  vizMode: 'particles' | 'ribbons' | 'nebula' | 'comets' | 'charcoal' | 'flames' | 'stars';
  palette: 'auto' | 'warm' | 'cool' | 'pastel' | 'monochrome' | 'autumn';
  addTranscript: (chunk: string) => void;
  setAnalysis: (p: { sentimentScore: number; sentimentLabel: string; energy: number; keywords: string[] }) => void;
  setInterim: (text: string) => void;
  clearInterim: () => void;
  setDeepgramConnected: (v: boolean) => void;
  setLastAnalysisNow: () => void;
  setVizMode: (m: 'particles' | 'ribbons' | 'nebula' | 'comets' | 'charcoal' | 'flames' | 'stars') => void;
  setPalette: (p: 'auto' | 'warm' | 'cool' | 'pastel' | 'monochrome' | 'autumn') => void;
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
  vizMode: 'particles',
  palette: 'auto',
  addTranscript: (chunk) => set((s) => ({ transcript: [...s.transcript, chunk] })),
  setAnalysis: ({ sentimentScore, sentimentLabel, energy, keywords }) =>
    set(() => ({ sentimentScore, sentimentLabel, energy, keywords })),
  setInterim: (text) => set(() => ({ interimTranscript: text })),
  clearInterim: () => set(() => ({ interimTranscript: '' })),
  setDeepgramConnected: (v) => set(() => ({ deepgramConnected: v })),
  setLastAnalysisNow: () => set(() => ({ lastAnalysisAt: Date.now() })),
  setVizMode: (m) => set(() => ({ vizMode: m })),
  setPalette: (p) => set(() => ({ palette: p })),
}));

export default useAuraStore;


