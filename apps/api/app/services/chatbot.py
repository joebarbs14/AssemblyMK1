"""FAQ chatbot — RAG over council knowledge-base articles.

Real LLM via Ollama when OLLAMA_BASE_URL is set; deterministic mock
otherwise so demos work everywhere.
"""
from __future__ import annotations

import logging

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import KbArticle

_log = logging.getLogger(__name__)


def retrieve(db: Session, *, council_id: int, query: str, k: int = 4) -> list[KbArticle]:
    """Naive lexical retrieval — substring match across title + body."""
    needles = [w for w in query.lower().split() if len(w) > 3]
    rows = db.query(KbArticle).filter(KbArticle.council_id == council_id).all()
    scored: list[tuple[int, KbArticle]] = []
    for a in rows:
        text = f"{a.title} {a.body}".lower()
        score = sum(text.count(n) for n in needles)
        if score > 0:
            scored.append((score, a))
    scored.sort(key=lambda kv: kv[0], reverse=True)
    return [a for _, a in scored[:k]]


def _build_prompt(question: str, articles: list[KbArticle]) -> str:
    ctx = "\n\n".join(f"[{i + 1}] {a.title}\n{a.body}" for i, a in enumerate(articles))
    return (
        "You are the council assistant. Answer ONLY using the context below. "
        "If the answer isn't there, say you don't know and suggest calling council. "
        "Cite sources as [1], [2] etc.\n\n"
        f"CONTEXT:\n{ctx}\n\nQUESTION: {question}\n\nANSWER:"
    )


def _mock_answer(question: str, articles: list[KbArticle]) -> str:
    if not articles:
        return ("I couldn't find anything in the council knowledge base about that. "
                "Please call council on the number listed in the contact page.")
    bits = [f"From '{a.title}' [{i + 1}]: {a.body.split('. ')[0]}." for i, a in enumerate(articles[:2])]
    return " ".join(bits) + " (Demo response — set OLLAMA_BASE_URL for full AI answers.)"


def answer(db: Session, *, council_id: int, question: str) -> tuple[str, list[int]]:
    articles = retrieve(db, council_id=council_id, query=question)
    citation_ids = [a.id for a in articles]
    if not settings.ollama_base_url:
        return _mock_answer(question, articles), citation_ids
    try:
        r = httpx.post(
            f"{settings.ollama_base_url.rstrip('/')}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": _build_prompt(question, articles),
                "stream": False,
            },
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json().get("response", "").strip(), citation_ids
    except Exception as exc:
        _log.warning("[chatbot] ollama failed: %s", exc)
        return _mock_answer(question, articles), citation_ids
