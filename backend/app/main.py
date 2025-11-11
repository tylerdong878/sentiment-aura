import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter").lower()
LLM_API_KEY = os.getenv("LLM_API_KEY", "")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL_OPENROUTER = "openrouter/auto"
DEFAULT_MODEL_GROQ = "llama-3.1-70b-versatile"


class ProcessTextRequest(BaseModel):
    text: str
    session_id: Optional[str] = None


class ProcessTextResponse(BaseModel):
    sentiment_score: float
    sentiment_label: str
    energy: float
    keywords: List[str]


app = FastAPI(title="Sentiment Aura Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process_text", response_model=ProcessTextResponse)
async def process_text(req: ProcessTextRequest):
    try:
        result = await analyze_text_llm(req.text)
        sentiment_score = float(result.get("sentiment_score", 0.5))
        sentiment_label = str(result.get("sentiment_label", "neutral"))
        energy = float(result.get("energy", 0.4))
        keywords = [str(k) for k in result.get("keywords", [])][:8]
        return ProcessTextResponse(
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label,
            energy=energy,
            keywords=keywords,
        )
    except Exception:
        text_lower = req.text.lower()
        sentiment_score = 0.7 if any(w in text_lower for w in ["great", "good", "love", "excited"]) else 0.3
        sentiment_label = "positive" if sentiment_score >= 0.5 else "negative"
        energy = 0.6 if len(req.text.split()) > 6 else 0.3
        keywords = list({w.strip(".,!?") for w in req.text.split() if len(w) > 4})[:5]
        return ProcessTextResponse(
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label,
            energy=energy,
            keywords=keywords,
        )


async def analyze_text_llm(text: str) -> dict:
    if not LLM_API_KEY:
        raise RuntimeError("Missing LLM_API_KEY")
    if LLM_PROVIDER == "groq":
        return await _analyze_with_groq(text)
    return await _analyze_with_openrouter(text)


async def _analyze_with_openrouter(text: str) -> dict:
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEFAULT_MODEL_OPENROUTER,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract sentiment/energy/keywords from text. "
                    "Return ONLY JSON with keys: sentiment_score (0..1), sentiment_label "
                    "('negative'|'neutral'|'positive'), energy (0..1), keywords (string[])."
                ),
            },
            {"role": "user", "content": text},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


async def _analyze_with_groq(text: str) -> dict:
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEFAULT_MODEL_GROQ,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract sentiment/energy/keywords from text. "
                    "Return ONLY JSON with keys: sentiment_score (0..1), sentiment_label "
                    "('negative'|'neutral'|'positive'), energy (0..1), keywords (string[])."
                ),
            },
            {"role": "user", "content": text},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(GROQ_URL, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


