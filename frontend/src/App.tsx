import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './App.css';
import useAuraStore from './state/auraStore';
import AuraCanvas from './components/AuraCanvas';

function TranscriptDisplay() {
  const transcript = useAuraStore((s) => s.transcript);
  return (
    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, maxHeight: 180, overflowY: 'auto', background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 12, backdropFilter: 'blur(6px)' }}>
      {transcript.map((line, idx) => (
        <div key={idx} style={{ color: 'white', opacity: 0.9, marginBottom: 4 }}>{line}</div>
      ))}
    </div>
  );
}

function KeywordCloud() {
  const keywords = useAuraStore((s) => s.keywords);
  return (
    <div style={{ position: 'absolute', bottom: 80, left: 16, right: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button
        onClick={() => {
          setRecording((r) => !r);
          if (!recording) {
            mockSpeak();
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
    document.body.style.background = `radial-gradient(1200px 800px at 50% 50%, rgba(0,150,255,${0.15 + energy * 0.2}), rgba(120,0,255,0.12))`;
    return () => {
      document.body.style.background = '';
    };
  }, [sentimentLabel, sentimentScore, energy]);
  return null;
}

function App() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuraCanvas />
      <AuraOverlay />
      <TranscriptDisplay />
      <KeywordCloud />
      <ControlBar />
      <div style={{ position: 'absolute', top: 16, right: 16, color: 'white', opacity: 0.8 }}>Sentiment Aura</div>
    </div>
  );
}

export default App
