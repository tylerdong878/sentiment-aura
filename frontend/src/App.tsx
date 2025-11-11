import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './App.css';
import useAuraStore from './state/auraStore';
import AuraCanvas from './components/AuraCanvas';
import { createPcmStreamer } from './services/audioPcm';
import { DeepgramRealtimeClient } from './services/deepgram';

function TranscriptDisplay() {
  const transcript = useAuraStore((s) => s.transcript);
  const interim = useAuraStore((s) => s.interimTranscript);
  return (
    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, maxHeight: 180, overflowY: 'auto', background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 12, backdropFilter: 'blur(6px)', zIndex: 2 }}>
      {transcript.map((line, idx) => (
        <div key={idx} style={{ color: 'white', opacity: 0.9, marginBottom: 4 }}>{line}</div>
      ))}
      {interim ? (
        <div style={{ color: 'white', opacity: 0.5, fontStyle: 'italic' }}>
          {interim}
        </div>
      ) : null}
    </div>
  );
}

function KeywordCloud() {
  const keywords = useAuraStore((s) => s.keywords);
  return (
    <div style={{ position: 'absolute', bottom: 80, left: 16, right: 16, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 2 }}>
      <AnimatePresence>
        {keywords.map((kw) => (
          <motion.span
            key={kw}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            style={{ color: 'white', background: 'rgba(255,255,255,0.08)', padding: '6px 10px', borderRadius: 999, backdropFilter: 'blur(6px)' }}
          >
            {kw}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ControlBar() {
  const [recording, setRecording] = useState(false);
  const addTranscript = useAuraStore((s) => s.addTranscript);
  const setAnalysis = useAuraStore((s) => s.setAnalysis);
  const setInterim = useAuraStore((s) => s.setInterim);
  const clearInterim = useAuraStore((s) => s.clearInterim);
  const setDeepgramConnected = useAuraStore((s) => s.setDeepgramConnected);
  const setLastAnalysisNow = useAuraStore((s) => s.setLastAnalysisNow);
  const [dgClient] = useState<DeepgramRealtimeClient | null>(() => {
    const key = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined;
    if (!key) return null;
    return new DeepgramRealtimeClient({
      apiKey: key,
      sampleRate: 16000,
      encoding: 'linear16',
      onOpen: () => setDeepgramConnected(true),
      onClose: () => setDeepgramConnected(false),
      onTranscript: (text, isFinal) => {
        if (!isFinal) {
          setInterim(text);
        } else {
          clearInterim();
          addTranscript(text);
          const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          axios
            .post(`${base}/process_text`, { text })
            .then((resp) => {
              const { sentiment_score, sentiment_label, energy, keywords } = resp.data;
              setAnalysis({ sentimentScore: sentiment_score, sentimentLabel: sentiment_label, energy, keywords });
              setLastAnalysisNow();
            })
            .catch((e) => console.error(e));
        }
      },
    });
  });
  const [recorder] = useState(() =>
    createPcmStreamer({
      targetSampleRate: 16000,
      onPcm: (buffer) => {
        dgClient?.sendAudioChunk(buffer);
      },
    })
  );

  async function mockSpeak() {
    const text = 'I am excited about building beautiful memory systems with this team!';
    addTranscript(text);
    try {
      const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const resp = await axios.post(`${base}/process_text`, { text });
      const { sentiment_score, sentiment_label, energy, keywords } = resp.data;
      setAnalysis({ sentimentScore: sentiment_score, sentimentLabel: sentiment_label, energy, keywords });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
      <button
        onClick={() => {
          if (!recording) {
            (async () => {
              if (dgClient) {
                await dgClient.connect();
              }
              await recorder.start();
              setRecording(true);
              if (!dgClient) {
                // Fallback demo if Deepgram key not set
                mockSpeak();
              }
            })();
          } else {
            recorder.stop();
            dgClient?.close();
            setRecording(false);
          }
        }}
        style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', color: 'white', background: recording ? 'rgba(255,60,60,0.4)' : 'rgba(60,255,120,0.3)' }}
      >
        {recording ? 'Stop' : 'Start'}
      </button>
      <div style={{ color: 'white', opacity: 0.8 }}>
        {recording ? 'Recording...' : 'Idle'}
      </div>
    </div>
  );
}

function AuraOverlay() {
  const sentimentLabel = useAuraStore((s) => s.sentimentLabel);
  const sentimentScore = useAuraStore((s) => s.sentimentScore);
  const energy = useAuraStore((s) => s.energy);
  useEffect(() => {
    const baseA = sentimentLabel === 'positive' ? [255, 160, 60] : sentimentLabel === 'negative' ? [60, 150, 255] : [150, 80, 255];
    const baseB = sentimentLabel === 'positive' ? [255, 80, 160] : sentimentLabel === 'negative' ? [80, 200, 255] : [120, 60, 220];
    const aAlpha = 0.12 + energy * 0.15;
    const bAlpha = 0.1 + energy * 0.12;
    document.body.style.background = `radial-gradient(1200px 800px at 50% 50%, rgba(${baseA[0]},${baseA[1]},${baseA[2]},${aAlpha}), rgba(${baseB[0]},${baseB[1]},${baseB[2]},${bAlpha}))`;
    return () => {
      document.body.style.background = '';
    };
  }, [sentimentLabel, sentimentScore, energy]);
  return null;
}

function StatusBar() {
  const deepgramConnected = useAuraStore((s) => s.deepgramConnected);
  const lastAnalysisAt = useAuraStore((s) => s.lastAnalysisAt);
  const vizMode = useAuraStore((s) => s.vizMode);
  const setVizMode = useAuraStore((s) => s.setVizMode);
  const palette = useAuraStore((s) => s.palette);
  const setPalette = useAuraStore((s) => s.setPalette);
  const label = deepgramConnected ? 'Deepgram: connected' : 'Deepgram: idle';
  const last = lastAnalysisAt ? ` | Last analysis: ${new Date(lastAnalysisAt).toLocaleTimeString()}` : '';
  return (
    <div style={{ position: 'absolute', top: 48, right: 16, display: 'flex', gap: 8, alignItems: 'center', zIndex: 3 }}>
      <div style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', color: 'white', fontSize: 12 }}>
        {label}{last}
      </div>
      <select
        value={vizMode}
        onChange={(e) => setVizMode(e.target.value as any)}
        style={{ background: 'rgba(0,0,0,0.35)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 8px' }}
      >
        <option value="particles">Particles</option>
        <option value="ribbons">Ribbons</option>
        <option value="nebula">Nebula</option>
        <option value="comets">Comets</option>
        <option value="charcoal">Charcoal</option>
        <option value="flames">Flames</option>
        <option value="stars">Stars</option>
      </select>
      <select
        value={palette}
        onChange={(e) => setPalette(e.target.value as any)}
        style={{ background: 'rgba(0,0,0,0.35)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 8px' }}
      >
        <option value="auto">Auto</option>
        <option value="warm">Warm</option>
        <option value="cool">Cool</option>
        <option value="pastel">Pastel</option>
        <option value="monochrome">Monochrome</option>
        <option value="autumn">Autumn</option>
      </select>
    </div>
  );
}

function App() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuraCanvas />
      <AuraOverlay />
      <StatusBar />
      <TranscriptDisplay />
      <KeywordCloud />
      <ControlBar />
      <div style={{ position: 'absolute', top: 16, right: 16, color: 'white', opacity: 0.8 }}>Sentiment Aura</div>
    </div>
  );
}

export default App
