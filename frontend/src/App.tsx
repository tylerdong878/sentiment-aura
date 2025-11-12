import { useEffect, useState, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTranscriptLengthRef = useRef(0);

  // Auto-scroll to bottom when new transcript lines are added or interim text updates
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const shouldScroll = transcript.length > lastTranscriptLengthRef.current || interim;
      
      if (shouldScroll) {
        // Update length tracker when new final lines are added
        if (transcript.length > lastTranscriptLengthRef.current) {
          lastTranscriptLengthRef.current = transcript.length;
        }
        
        // Use requestAnimationFrame for smooth scrolling after DOM update
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }
        });
      }
    }
  }, [transcript, interim]);

  return (
    <div 
      ref={scrollContainerRef}
      className="transcript-scroll"
      style={{ 
        position: 'absolute', 
        top: 60, // Start below the title
        left: 16, 
        right: 475, // Leave room for status bar controls on right
        maxHeight: 220, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        background: 'rgba(0,0,0,0.25)', 
        padding: 16, 
        borderRadius: 16, 
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 2,
        scrollBehavior: 'smooth',
        // Firefox scrollbar styling
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.3) transparent',
      }}
    >
      {transcript.map((line, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 0.95, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.4, delay: idx * 0.05 }}
          style={{
            color: 'white',
            marginBottom: 8,
            lineHeight: 1.6,
            wordWrap: 'break-word',
            padding: '4px 0',
            borderLeft: '2px solid rgba(255,255,255,0.2)',
            paddingLeft: 8,
          }}
        >
          {line}
        </motion.div>
      ))}
      {interim ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          exit={{ opacity: 0 }}
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontStyle: 'italic',
            marginBottom: 8,
            lineHeight: 1.6,
            wordWrap: 'break-word',
            padding: '4px 0',
            paddingLeft: 8,
          }}
        >
          {interim}
        </motion.div>
      ) : null}
    </div>
  );
}

function KeywordCloud() {
  const keywords = useAuraStore((s) => s.keywords);
  const [animatingKey, setAnimatingKey] = useState(0);
  const prevKeywordsRef = useRef<string[]>([]);

  // Trigger re-animation when keywords change
  useEffect(() => {
    if (keywords.length > 0 && JSON.stringify(keywords) !== JSON.stringify(prevKeywordsRef.current)) {
      prevKeywordsRef.current = [...keywords];
      setAnimatingKey(prev => prev + 1);
    }
  }, [keywords]);

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: 80, 
      left: 16, 
      right: 16, 
      display: 'flex', 
      gap: 10, 
      flexWrap: 'wrap', 
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      zIndex: 2,
      minHeight: 60,
    }}>
      <AnimatePresence mode="popLayout">
        {keywords.map((kw, idx) => {
          // Stagger delay: each keyword animates 0.12s after the previous
          // This creates the "one by one" effect
          const delay = idx * 0.12;
          
          return (
            <motion.span
              key={`${kw}-${animatingKey}`}
              layout
              initial={{ 
                opacity: 0, 
                y: 60, // Float up from bottom
                scale: 0.7,
                filter: 'blur(6px)'
              }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                filter: 'blur(0px)'
              }}
              exit={{ 
                opacity: 0, 
                y: -30, 
                scale: 0.7,
                filter: 'blur(4px)'
              }}
              transition={{ 
                duration: 0.7,
                delay: delay,
                ease: [0.16, 1, 0.3, 1], // Smooth ease-out for float-up effect
                layout: { duration: 0.4, ease: 'easeOut' }
              }}
              whileHover={{ 
                scale: 1.15, 
                y: -4,
                transition: { duration: 0.2, ease: 'easeOut' }
              }}
              style={{ 
                color: 'white', 
                background: 'rgba(255,255,255,0.14)', 
                padding: '8px 16px', 
                borderRadius: 24, 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                cursor: 'default',
                whiteSpace: 'nowrap',
                letterSpacing: '0.3px',
              }}
            >
              {kw}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function RecordingWaveform({ recording }: { recording: boolean }) {
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    if (!recording) {
      setAmplitude(0);
      return;
    }
    const interval = setInterval(() => {
      // Simulate audio amplitude (in real app, get from audio stream)
      setAmplitude(0.3 + Math.random() * 0.7);
    }, 100);
    return () => clearInterval(interval);
  }, [recording]);

  if (!recording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{ display: 'flex', gap: 3, alignItems: 'center', height: 20 }}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          animate={{
            height: 4 + amplitude * 14 + Math.sin(Date.now() / 150 + i * 0.5) * 3,
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            width: 3,
            background: `rgba(255,255,255,${0.6 + amplitude * 0.4})`,
            borderRadius: 2,
            minHeight: 4,
          }}
        />
      ))}
    </motion.div>
  );
}

function ControlBar() {
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
          setIsProcessing(true);
          const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          // Add timeout for slow API responses (20 seconds)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - LLM API is slow or unresponsive')), 20000)
          );
          Promise.race([
            axios.post<{ sentiment_score: number; sentiment_label: string; energy: number; keywords: string[] }>(`${base}/process_text`, { text }),
            timeoutPromise as Promise<never>
          ])
            .then((resp) => {
              const { sentiment_score, sentiment_label, energy, keywords } = resp.data;
              setAnalysis({ sentimentScore: sentiment_score, sentimentLabel: sentiment_label, energy, keywords });
              setLastAnalysisNow();
              setIsProcessing(false);
            })
            .catch((e) => {
              console.error('Backend API error:', e);
              // Fallback: use neutral sentiment if API fails
              setAnalysis({ 
                sentimentScore: 0.5, 
                sentimentLabel: 'neutral', 
                energy: 0.4, 
                keywords: [] 
              });
              setIsProcessing(false);
            });
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
    setIsProcessing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const resp = await axios.post(`${base}/process_text`, { text });
      const { sentiment_score, sentiment_label, energy, keywords } = resp.data;
      setAnalysis({ sentimentScore: sentiment_score, sentimentLabel: sentiment_label, energy, keywords });
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  }

  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2, gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.button
          onClick={() => {
            if (!recording) {
              (async () => {
                if (dgClient) {
                  await dgClient.connect();
                }
                await recorder.start();
                setRecording(true);
                if (!dgClient) {
                  mockSpeak();
                }
              })();
            } else {
              recorder.stop();
              dgClient?.close();
              setRecording(false);
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: recording 
              ? ['0 0 0px rgba(255,60,60,0.4)', '0 0 20px rgba(255,60,60,0.6)', '0 0 0px rgba(255,60,60,0.4)']
              : '0 0 0px rgba(60,255,120,0.3)',
          }}
          transition={{
            boxShadow: { duration: 2, repeat: recording ? Infinity : 0, ease: 'easeInOut' },
          }}
          style={{
            position: 'relative',
            padding: '12px 24px',
            borderRadius: 30,
            border: recording ? '2px solid rgba(255,60,60,0.6)' : '2px solid rgba(60,255,120,0.5)',
            color: 'white',
            background: recording ? 'rgba(255,60,60,0.3)' : 'rgba(60,255,120,0.2)',
            backdropFilter: 'blur(10px)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          {recording ? '⏹ Stop' : '▶ Start'}
          {recording && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: 30,
                border: '2px solid rgba(255,60,60,0.6)',
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <motion.div
            animate={{ opacity: recording ? [0.6, 1, 0.6] : 0.6 }}
            transition={{ duration: 1.5, repeat: recording ? Infinity : 0 }}
            style={{ color: 'white', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {recording ? (
              <>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ display: 'inline-block' }}
                >
                  ●
                </motion.span>
                Recording
              </>
            ) : (
              'Idle'
            )}
          </motion.div>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontStyle: 'italic' }}
            >
              Analyzing...
            </motion.div>
          )}
        </div>
      </div>
      {recording && <RecordingWaveform recording={recording} />}
    </div>
  );
}

function AuraOverlay() {
  const sentimentLabel = useAuraStore((s) => s.sentimentLabel);
  const sentimentScore = useAuraStore((s) => s.sentimentScore);
  const energy = useAuraStore((s) => s.energy);
  
  useEffect(() => {
    // More dramatic color mapping based on sentiment
    let baseA: number[], baseB: number[], baseC: number[];
    
    if (sentimentLabel === 'positive') {
      // Warm, energetic colors for positive sentiment
      baseA = [255, Math.floor(120 + sentimentScore * 80), Math.floor(40 + sentimentScore * 60)];
      baseB = [255, Math.floor(80 + sentimentScore * 100), Math.floor(120 + sentimentScore * 80)];
      baseC = [255, Math.floor(180 + sentimentScore * 40), Math.floor(200 + sentimentScore * 55)];
    } else if (sentimentLabel === 'negative') {
      // Cool, subdued colors for negative sentiment
      baseA = [Math.floor(60 + sentimentScore * 40), Math.floor(120 + sentimentScore * 60), Math.floor(200 + sentimentScore * 55)];
      baseB = [Math.floor(40 + sentimentScore * 60), Math.floor(150 + sentimentScore * 50), Math.floor(220 + sentimentScore * 35)];
      baseC = [Math.floor(80 + sentimentScore * 40), Math.floor(100 + sentimentScore * 80), Math.floor(180 + sentimentScore * 60)];
    } else {
      // Neutral/purple tones
      baseA = [Math.floor(120 + sentimentScore * 60), Math.floor(60 + sentimentScore * 80), Math.floor(200 + sentimentScore * 55)];
      baseB = [Math.floor(150 + sentimentScore * 50), Math.floor(80 + sentimentScore * 70), Math.floor(220 + sentimentScore * 35)];
      baseC = [Math.floor(100 + sentimentScore * 80), Math.floor(40 + sentimentScore * 100), Math.floor(180 + sentimentScore * 60)];
    }
    
    // Energy affects intensity and size of gradients
    const intensity = 0.08 + energy * 0.18;
    const size = 1000 + energy * 600;
    
    // Create multiple layered gradients for depth
    const gradient1 = `radial-gradient(${size}px ${size * 0.8}px at 30% 40%, rgba(${baseA[0]},${baseA[1]},${baseA[2]},${intensity * 1.2}), transparent 70%)`;
    const gradient2 = `radial-gradient(${size * 0.7}px ${size * 0.6}px at 70% 60%, rgba(${baseB[0]},${baseB[1]},${baseB[2]},${intensity}), transparent 60%)`;
    const gradient3 = `radial-gradient(${size * 0.5}px ${size * 0.5}px at 50% 50%, rgba(${baseC[0]},${baseC[1]},${baseC[2]},${intensity * 0.6}), transparent 50%)`;
    
    document.body.style.background = `${gradient1}, ${gradient2}, ${gradient3}, radial-gradient(circle at center, rgba(10,10,15,0.95) 0%, rgba(5,5,10,1) 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.transition = 'background 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    
    return () => {
      document.body.style.background = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.transition = '';
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
  return (
    <div style={{ position: 'absolute', top: 48, right: 16, display: 'flex', gap: 8, alignItems: 'center', zIndex: 3, flexWrap: 'wrap' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '8px 14px',
          borderRadius: 20,
          background: deepgramConnected ? 'rgba(60,255,120,0.2)' : 'rgba(120,120,120,0.2)',
          border: `1px solid ${deepgramConnected ? 'rgba(60,255,120,0.4)' : 'rgba(120,120,120,0.3)'}`,
          backdropFilter: 'blur(10px)',
          color: 'white',
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <motion.div
          animate={{
            scale: deepgramConnected ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 2, repeat: deepgramConnected ? Infinity : 0 }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: deepgramConnected ? '#3cff78' : '#888',
          }}
        />
        {deepgramConnected ? 'Connected' : 'Idle'}
      </motion.div>
      {lastAnalysisAt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: '6px 12px',
            borderRadius: 16,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 11,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {new Date(lastAnalysisAt).toLocaleTimeString()}
        </motion.div>
      )}
      <motion.select
        value={vizMode}
        onChange={(e) => {
          const value = e.target.value as 'particles' | 'ribbons' | 'nebula' | 'comets' | 'charcoal' | 'flames' | 'aurora' | 'watercolor' | 'ink' | 'fiber' | 'sparkles' | 'waves' | 'smoke' | 'plasma' | 'magnetic' | 'crystals' | 'lava' | 'tendrils' | 'marbling' | 'silk' | 'bloom' | 'lace' | 'fireworks' | 'mist' | 'rivers';
          setVizMode(value);
        }}
        whileHover={{ scale: 1.05 }}
        whileFocus={{ scale: 1.05 }}
        style={{
          background: 'rgba(0,0,0,0.4)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 12,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
        }}
      >
        <option value="particles">Particles</option>
        <option value="ribbons">Ribbons</option>
        <option value="aurora">Aurora</option>
        <option value="plasma">Plasma</option>
        <option value="bloom">Bloom</option>
        <option value="watercolor">Watercolor</option>
        <option value="marbling">Marbling</option>
        <option value="silk">Silk</option>
        <option value="ink">Ink</option>
        <option value="lace">Lace</option>
        <option value="fiber">Fiber</option>
        <option value="sparkles">Sparkles</option>
        <option value="fireworks">Fireworks</option>
        <option value="waves">Waves</option>
        <option value="rivers">Rivers</option>
        <option value="smoke">Smoke</option>
        <option value="mist">Mist</option>
        <option value="magnetic">Magnetic</option>
        <option value="crystals">Crystals</option>
        <option value="lava">Lava</option>
        <option value="tendrils">Tendrils</option>
        <option value="nebula">Nebula</option>
        <option value="comets">Comets</option>
        <option value="charcoal">Charcoal</option>
        <option value="flames">Flames</option>
      </motion.select>
      <motion.select
        value={palette}
        onChange={(e) => {
          const value = e.target.value as 'auto' | 'warm' | 'cool' | 'pastel' | 'monochrome' | 'autumn';
          setPalette(value);
        }}
        whileHover={{ scale: 1.05 }}
        whileFocus={{ scale: 1.05 }}
        style={{
          background: 'rgba(0,0,0,0.4)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 12,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
        }}
      >
        <option value="auto">Auto</option>
        <option value="warm">Warm</option>
        <option value="cool">Cool</option>
        <option value="pastel">Pastel</option>
        <option value="monochrome">Monochrome</option>
        <option value="autumn">Autumn</option>
      </motion.select>
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
      {/* Title in top-left */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: 'white',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          letterSpacing: '-0.5px',
        }}>
          Sentiment Aura
        </h1>
      </motion.div>
    </div>
  );
}

export default App
