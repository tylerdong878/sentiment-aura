# Sentiment Aura

A full-stack web application that performs **real-time audio transcription** and visualizes the speaker's emotional sentiment and key topics as a **live, generative art display**. Built as a take-home project demonstrating full-stack orchestration, data-driven visualization, and polished frontend development.

## 🎯 Project Overview

This application captures live audio from the user's microphone, transcribes it in real-time using Deepgram, analyzes sentiment and extracts keywords using LLM APIs (OpenRouter/Groq), and visualizes the emotional data through a beautiful Perlin noise-based generative art display. The visualization reacts smoothly to sentiment (color), energy (motion), and keywords (density) in real-time.

### Key Features

- **Real-time Audio Transcription**: WebSocket streaming to Deepgram API
- **AI-Powered Sentiment Analysis**: LLM-based sentiment scoring and keyword extraction
- **24 Visualization Modes**: Diverse Perlin noise-based rendering styles
- **6 Color Palettes**: Auto, Warm, Cool, Pastel, Monochrome, Autumn
- **Smooth Data-Driven Animations**: All visual parameters respond fluidly to AI data
- **Polished UI**: Auto-scrolling transcripts, staggered keyword animations, glassmorphism design
- **Full-Stack Architecture**: React frontend, FastAPI backend, two external APIs

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **p5.js** + **react-p5** - Generative visualization canvas
- **Zustand** - Global state management
- **Framer Motion** - UI animations
- **Web Audio API** - Microphone capture
- **AudioWorklet** - Real-time PCM audio processing (16kHz, 16-bit)
- **WebSocket** - Real-time Deepgram connection

### Backend
- **FastAPI** - Python web framework
- **httpx** - Async HTTP client for LLM API calls
- **Pydantic** - Data validation
- **python-dotenv** - Environment variable management

### External APIs
- **Deepgram** - Real-time speech-to-text transcription
- **OpenRouter** or **Groq** - LLM for sentiment analysis and keyword extraction

## 📋 Prerequisites

- **Node.js** 20+ 
- **Python** 3.11+
- **Deepgram API Key** (sign up at https://deepgram.com - $200 free credits)
- **OpenRouter API Key** (https://openrouter.ai) or **Groq API Key** (https://groq.com)

## 🚀 Quickstart

### 1) Backend Setup (FastAPI)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

Create `backend/.env`:
```env
LLM_PROVIDER=openrouter
LLM_API_KEY=YOUR_OPENROUTER_OR_GROQ_KEY
```

Run the backend:
```powershell
.\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Verify it's running:
```
http://localhost:8000/health
```

### 2) Frontend Setup (React + Vite)

```powershell
cd ../frontend
npm install
```

Create `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=YOUR_DEEPGRAM_KEY
```

Run the frontend:
```powershell
npm run dev
```

Open the printed URL (typically `http://localhost:5173`).

### 3) Using the Application

1. Click **"Start"** button
2. Allow microphone access when prompted
3. Speak clearly - you'll see:
   - **Interim transcript** (italic) appears in real-time
   - **Final transcript** (solid) appears after brief pauses
   - **Keywords** fade in one by one from the bottom
   - **Visualization** reacts to sentiment and energy
4. Watch the **Network tab** to see POST requests to `/process_text` on each final transcript segment

## 🏗️ Architecture & Data Flow

### System Components

1. **Frontend (React)**: Captures audio, manages WebSocket connection, displays UI, renders visualization
2. **Backend (FastAPI)**: Receives text, calls LLM API, returns structured sentiment/keywords
3. **Deepgram API**: Real-time transcription via WebSocket
4. **LLM API (OpenRouter/Groq)**: Sentiment analysis and keyword extraction

### Data Flow (10 Steps)

1. **User clicks "Start"** → React requests microphone access
2. **Audio capture begins** → AudioWorklet processes 16kHz PCM audio
3. **WebSocket opens** → Frontend connects to Deepgram with API key as subprotocol
4. **Audio streams** → Raw PCM chunks sent to Deepgram via WebSocket
5. **Transcription received** → Deepgram streams back JSON with `{"text": "...", "is_final": true/false}`
6. **Interim display** → Frontend shows interim text in italic
7. **Final trigger** → When `is_final: true`, frontend POSTs text to backend `/process_text`
8. **LLM analysis** → Backend calls OpenRouter/Groq with prompt for sentiment/keywords
9. **Response parsed** → Backend returns JSON: `{sentiment_score, sentiment_label, energy, keywords}`
10. **State update** → Frontend updates Zustand store, visualization and UI react

### API Endpoints

#### `GET /health`
Health check endpoint.
- **Response**: `{"status": "ok"}`

#### `POST /process_text`
Analyzes text for sentiment and keywords.
- **Request Body**:
  ```json
  {
    "text": "I love building beautiful applications!",
    "session_id": "optional-session-id"
  }
  ```
- **Response**:
  ```json
  {
    "sentiment_score": 0.85,
    "sentiment_label": "positive",
    "energy": 0.72,
    "keywords": ["love", "building", "beautiful", "applications"]
  }
  ```
- **Fallback**: If LLM API fails, returns heuristic-based mock response

## 🎨 How the Aura Maps AI Data

### Sentiment → Color Mapping

The visualization uses **sentiment score (0→1)** to control color properties:

- **Color Hue**: 
  - **Negative sentiment (0-0.4)**: Cool blues and cyans (200-230° on HSB color wheel)
  - **Neutral sentiment (0.4-0.6)**: Purple tones (150-200°)
  - **Positive sentiment (0.6-1.0)**: Warm oranges, yellows, and pinks (10-50°)
  - All transitions use **lerp (linear interpolation)** every frame for smooth color shifts - no jarring jumps

- **Brightness**:
  - **Negative**: Dimmer (60-70% brightness) - creates subdued, melancholic feel
  - **Positive**: Brighter (85-96% brightness) - creates vibrant, energetic feel
  - **Neutral**: Mid-range brightness

- **Background Gradients**:
  - Multiple layered radial gradients create depth
  - Gradient size and intensity scale with energy
  - Colors shift smoothly over 1.5 seconds using cubic-bezier easing

### Energy → Motion Mapping

The **energy score (0→1)** controls motion and intensity:

- **Flow Speed**: Particles/ribbons move faster as energy increases (0.6x → 3.2x speed multiplier)
- **Noise Turbulence**: Field becomes more chaotic and "alive" with higher energy
- **Visual Size**: Marks, strokes, and particles are larger with higher energy
- **Gradient Intensity**: Background gradients become more intense and larger with energy
- **Sudden Changes**: Turbulence boost triggers on rapid sentiment/energy changes for dramatic moments

### Keywords → Density

- More keywords slightly increase visual density/opacity
- Richer speech content creates a "fuller" visual experience

### Visualization Modes

All **24 modes** use the same underlying **Perlin noise flow field** but render it differently:

**Organic/Flow Styles:**
- **Particles**: Glowing additive flow with smooth trails
- **Ribbons**: Aurora-like flowing curves
- **Aurora**: Vertical flowing bands like northern lights
- **Plasma**: Swirling, organic blobs with dual noise layers
- **Tendrils**: Branching, organic growth patterns
- **Fiber**: Woven thread-like patterns
- **Rivers**: Flowing river-like patterns with smooth curves
- **Silk**: Smooth, flowing fabric-like patterns

**Artistic Styles:**
- **Watercolor**: Soft, blended strokes with multiply blending
- **Marbling**: Swirling marble-like patterns with elliptical strokes
- **Ink**: Organic splashes and drips
- **Charcoal**: Textured sketch strokes with square caps
- **Flames**: Lifetime-fading saturation for fiery feel
- **Lace**: Delicate, intricate patterns with fine lines

**Atmospheric Styles:**
- **Nebula**: Soft cloud layers
- **Smoke**: Billowing, soft clouds that float upward
- **Mist**: Ethereal, soft mist with screen blending
- **Waves**: Ocean-like rhythmic patterns
- **Sparkles**: Glittery, scattered bright points
- **Bloom**: Soft, glowing blooms with concentric circles

**Cosmic/Celestial:**
- **Fireworks**: Explosive, radiating patterns with sparks

**Geometric/Structured:**
- **Comets**: Streaks with fading tails
- **Magnetic**: Field lines with attraction points
- **Crystals**: Geometric, faceted hexagonal shapes
- **Lava**: Glowing, flowing molten patterns

### Palettes

- **Auto**: Default cool→warm mapping based on sentiment
- **Warm**: Orange/red tones (35° → 10°)
- **Cool**: Blue/cyan tones (230° → 170°)
- **Pastel**: Low saturation (40%), high brightness (95%)
- **Monochrome**: Grayscale (0% saturation)
- **Autumn**: Orange/red tones (30° → 10°)

All modes and palettes respond to the same sentiment/energy data, creating different aesthetic interpretations of the same emotional content.

## 📁 Project Structure

```
sentiment-aura/
├── backend/
│   ├── app/
│   │   └── main.py          # FastAPI app with /health and /process_text
│   ├── requirements.txt      # Python dependencies
│   └── .env                 # LLM_PROVIDER, LLM_API_KEY
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main UI component, orchestration
│   │   ├── components/
│   │   │   └── AuraCanvas.tsx  # p5.js Perlin noise visualization
│   │   ├── state/
│   │   │   └── auraStore.ts    # Zustand global state
│   │   ├── services/
│   │   │   ├── deepgram.ts     # WebSocket connection to Deepgram
│   │   │   └── audioPcm.ts     # AudioWorklet-based PCM capture
│   │   └── worklets/
│   │       └── pcm-processor.js  # AudioWorklet processor
│   ├── .env                 # VITE_BACKEND_URL, VITE_DEEPGRAM_API_KEY
│   └── package.json
│
├── README.md
├── DEMO_SCRIPT.md           # Step-by-step demo script
├── plan.md                  # Project planning document
└── env.example.txt          # Environment variable template
```

## 🔧 Environment Variables

### Backend (`backend/.env`)
```env
LLM_PROVIDER=openrouter    # or "groq"
LLM_API_KEY=your_key_here
```

### Frontend (`frontend/.env`)
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=your_deepgram_key_here
```

## 🐛 Troubleshooting

### Deepgram Connection Issues
- **Symptom**: "Idle" status, no transcription
- **Solution**: 
  - Verify `VITE_DEEPGRAM_API_KEY` is set correctly
  - Check browser console for WebSocket errors
  - Ensure microphone permissions are granted
  - Deepgram uses subprotocol authentication (API key passed as WebSocket subprotocol)

### LLM API Errors
- **Symptom**: Backend returns mock/heuristic responses
- **Solution**:
  - Verify `LLM_API_KEY` is set in `backend/.env`
  - Check backend console for error messages
  - Verify `LLM_PROVIDER` is set to "openrouter" or "groq"
  - Backend has fallback heuristics, so app continues working

### Audio Not Capturing
- **Symptom**: No waveform, no transcription
- **Solution**:
  - Check browser microphone permissions
  - Verify AudioWorklet is supported (modern browsers)
  - Check browser console for audio errors
  - Fallback to ScriptProcessorNode if AudioWorklet unavailable

### CORS Errors
- **Symptom**: Frontend can't reach backend
- **Solution**: Backend has CORS middleware allowing `localhost:5173` - verify backend is running on port 8000

## ✨ Key Implementation Details

### Full-Stack Orchestration
- **Real-time WebSocket**: Direct browser-to-Deepgram connection (no backend proxy needed)
- **RESTful API**: Frontend → Backend → LLM API chain
- **State Management**: Zustand for global state, React hooks for local state
- **Error Handling**: Graceful fallbacks for API failures

### Data-Driven Visualization
- **Perlin Noise Flow Fields**: All 25 modes use the same underlying algorithm
- **Smooth Interpolation**: Lerp (linear interpolation) for all parameter transitions
- **Multi-Parameter Mapping**: Sentiment → color, Energy → motion, Keywords → density
- **Dynamic Response**: Turbulence boost on sudden changes for dramatic effect

### Frontend Polish
- **Auto-scrolling Transcript**: Smooth scroll to bottom on new content
- **Staggered Animations**: Keywords fade in one by one (0.12s delay each)
- **Glassmorphism UI**: Backdrop blur, semi-transparent panels
- **Visual Feedback**: Recording waveform, connection status, processing indicators
- **Smooth Transitions**: Framer Motion for all UI animations

### Audio Processing
- **Modern AudioWorklet**: Separate thread for audio processing (no main thread blocking)
- **16kHz PCM**: Raw audio format required by Deepgram
- **Fallback Support**: ScriptProcessorNode for older browsers

## 📊 Assessment Criteria Coverage

This project demonstrates:

✅ **Full-Stack Orchestration**: Frontend, backend, and two external APIs work seamlessly together in real-time

✅ **Data-Driven Visualization**: Abstract AI data (sentiment, energy, keywords) mapped to multiple visual parameters (color, motion, density) in an aesthetically pleasing and fluid way

✅ **Frontend Polish**: Smooth color transitions, graceful keyword animations, auto-scrolling transcripts, polished UI with attention to detail

✅ **Async Management & Error Handling**: Graceful fallbacks for API failures, connection status indicators, processing states

## 🎬 Demo Tips

- **Speak in short sentences** and pause briefly; Deepgram emits final segments after pauses
- **Watch the top-left transcript panel**; interim (italic) will solidify to final
- **Check browser Network tab** for POST `/process_text` calls on each final line
- **Try different visualization modes** to see how the same data creates different aesthetics
- **Switch palettes** to see how color interpretation changes
- **Speak with different emotions** to see dramatic color and motion changes

## 📝 Notes

- If Deepgram fails to connect, verify the key and try again. We use browser WS with subprotocol auth.
- If LLM fails, backend falls back to a heuristic so the demo continues.
- You can switch providers by setting `LLM_PROVIDER=groq` and supplying `LLM_API_KEY`.
- All visualization modes use the same Perlin noise field - only the rendering technique differs.
- Color transitions use lerp (linear interpolation) for smooth, fluid changes.

## 📄 License

This project was created as a take-home assignment for Memory Machines.
