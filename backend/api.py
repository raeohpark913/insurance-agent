#!/usr/bin/env python3
"""
KB라이프 보험 AI — FastAPI 백엔드
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from rag_pipeline import InsuranceRAGAgent

app = FastAPI(title="KB라이프 보험 AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = InsuranceRAGAgent()

class ChatRequest(BaseModel):
    query: str
    user_profile: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    blocked: bool
    block_reason: Optional[str]
    sources: list[str]
    flagged: bool
    grounded: bool

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    result = agent.chat(req.query, req.user_profile)
    return ChatResponse(
        response=result["response"],
        blocked=result["blocked"],
        block_reason=result.get("block_reason"),
        sources=result.get("sources", []),
        flagged=result.get("flagged", False),
        grounded=result.get("grounded", False),
    )

@app.post("/reset")
def reset():
    agent.reset()
    return {"ok": True}

@app.get("/health")
def health():
    return {"status": "ok"}
