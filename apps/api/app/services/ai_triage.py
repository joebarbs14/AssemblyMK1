"""AI report triage — categorise a resident-submitted report.

FOSS-first: default implementation is a rule-based keyword classifier
that runs locally with zero dependencies. When you want better results,
wire any of:
- Hugging Face Inference API (free tier) for image classification
- Local Ollama / llama.cpp running a vision model
- Any provider's CLIP-style endpoint

Set AI_PROVIDER=huggingface + AI_API_KEY to enable real inference.
"""
from __future__ import annotations

import logging
from typing import Any

_log = logging.getLogger(__name__)


KEYWORD_HINTS: dict[str, list[str]] = {
    "pothole": ["pothole", "road damage", "road surface", "pavement", "asphalt"],
    "streetlight": ["light", "streetlight", "lamp", "globe", "lamppost", "bulb"],
    "illegal_dumping": ["dump", "rubbish", "trash", "couch", "mattress", "abandoned"],
    "graffiti": ["graffiti", "tag", "spray", "vandal", "paint"],
    "tree": ["tree", "branch", "fallen", "leaning", "trunk", "stump"],
    "footpath": ["footpath", "pavement", "sidewalk", "kerb", "curb", "tripping"],
    "stormwater": ["drain", "flood", "stormwater", "blocked", "overflow", "puddle"],
    "noise": ["noise", "loud", "music", "party", "construction noise"],
    "parking": ["parking", "parked", "car", "blocking driveway", "double parked"],
}

PRIORITY_HINTS: dict[str, list[str]] = {
    "urgent": ["dangerous", "emergency", "injured", "fallen on road", "blocking traffic"],
    "high": ["large", "deep", "broken", "across", "spreading"],
    "low": ["small", "minor", "cosmetic"],
}


def classify_report(
    *, title: str, description: str, has_photo: bool = False
) -> dict[str, Any]:
    """Returns a triage hint dict: category_key, priority, confidence, rationale."""
    text = (title + " " + description).lower()
    scores: dict[str, int] = {}
    for cat, words in KEYWORD_HINTS.items():
        hits = sum(1 for w in words if w in text)
        if hits:
            scores[cat] = hits
    if not scores:
        return {
            "suggested_category_key": "other",
            "suggested_priority": "normal",
            "confidence": 0.3,
            "rationale": "No strong category signal in description.",
            "provider": "mock-rules",
        }

    top = max(scores.items(), key=lambda kv: kv[1])
    total_hits = sum(scores.values())
    confidence = min(0.95, 0.4 + 0.15 * top[1] / max(1, total_hits) + (0.1 if has_photo else 0))

    priority = "normal"
    for level, signals in PRIORITY_HINTS.items():
        if any(s in text for s in signals):
            priority = level
            break

    return {
        "suggested_category_key": top[0],
        "suggested_priority": priority,
        "confidence": round(confidence, 2),
        "rationale": (
            f"Matched {top[1]} keyword(s) for '{top[0]}'"
            + (f", priority={priority} from text" if priority != "normal" else "")
        ),
        "provider": "mock-rules",
    }
