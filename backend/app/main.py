from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional


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
    # Mocked response for initial wiring; will replace with LLM call
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


