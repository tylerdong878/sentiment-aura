# Sentiment Aura

Live transcription + AI-driven sentiment/keywords + generative Perlin visualization.

## Quickstart

Prereqs: Node 20+, Python 3.11+, a Deepgram API key, and an OpenRouter or Groq API key.

### 1) Backend (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
notepad .env
```
Example `.env`:
```
LLM_PROVIDER=openrouter
LLM_API_KEY=YOUR_OPENROUTER_OR_GROQ_KEY
```
Run:
```powershell
.\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```
Health:
```
http://localhost:8000/health
```

### 2) Frontend (Vite + React)
```powershell
cd ../frontend
notepad .env
```
Example `frontend/.env`:
```
VITE_BACKEND_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=YOUR_DEEPGRAM_KEY
```
Install and run:
```powershell
npm install
npm run dev
```
Open the printed URL (e.g. http://localhost:5173). Click Start, allow mic access, speak. Interim transcript appears; on final segments, keywords and the aura update. Each final line POSTs to `/process_text`.

## How the Aura Maps AI Data (for your demo)
- Sentiment score (0→1):
  - Color hue: cool blues at low sentiment → warm ambers at high sentiment.
  - Brightness: dimmer when negative/neutral → brighter when positive.
  - Smoothness: we lerp sentiment every frame so color shifts glide, not jump.
- Energy (0→1):
  - Flow speed: particles/ribbons move faster as energy increases.
  - Noise turbulence: increases with energy to make the field feel “alive.”
  - Trail/size: slightly larger marks with higher energy for presence.
- Sudden change response:
  - A short-lived “turbulence” bump triggers when sentiment/energy change quickly, adding swirl for dramatic moments, then decays.
- Keywords:
  - Density/opacity: more keywords slightly increase particle density/opacity so richer speech visually “fills the room.”
- Palettes and Modes:
  - Palettes: Auto, Warm, Cool, Pastel, Monochrome, Autumn tune hue/saturation ranges.
  - Modes:
    - Particles: glowing additive flow.
    - Ribbons: aurora-like curves.
    - Nebula: soft cloud layers with subtle stars.
    - Comets: streaks with fading tails.
    - Charcoal: textured sketch strokes.
    - Flames: lifetime-fading saturation for fiery feel.
    - Stars: calm starfield with occasional shooting stars.

## Notes
- If Deepgram fails to connect, verify the key and try again. We use browser WS with subprotocol auth.
- If LLM fails, backend falls back to a heuristic so the demo continues.
- You can switch providers by setting `LLM_PROVIDER=groq` and supplying `LLM_API_KEY`.

## Repo Structure
- `backend/` FastAPI service with `/health` and `/process_text`
- `frontend/` React app (Vite, TS). Key files:
  - `src/App.tsx` UI + orchestration
  - `src/components/AuraCanvas.tsx` Perlin-style field via p5
  - `src/state/auraStore.ts` global state (zustand)
  - `src/services/deepgram.ts` realtime WS
  - `src/services/audioPcm.ts` AudioWorklet-based 16k PCM capture
  - `src/worklets/pcm-processor.js` audio worklet processor

## Demo Tips
- Speak in short sentences and pause briefly; Deepgram emits final segments after pauses.
- Watch the top-left transcript panel; interim (italic) will solidify to final.
- Check browser Network tab for POST `/process_text` calls on each final line.
