"""Translation — FOSS-first.

Default mode passes text through unchanged + tags the language. For real
translation, recommended FOSS options:
- LibreTranslate (self-hostable; AGPL; runs on free Render Cosmos plan)
- Argos Translate (offline, MIT)
- Hugging Face Helsinki NLP models (free tier)
- Mozilla Bergamot (client-side, in-browser, no server)

The translate() interface stays stable; flip provider per council.
"""
from __future__ import annotations

LANGS = {
    "en": "English",
    "zh": "中文",
    "ar": "العربية",
    "vi": "Tiếng Việt",
    "pa": "ਪੰਜਾਬੀ",
    "el": "Ελληνικά",
}


def translate(text: str, *, source: str = "en", target: str = "en") -> dict[str, str]:
    """Pass-through stub. Wire LibreTranslate by replacing the body."""
    if source == target:
        return {"text": text, "source": source, "target": target, "provider": "noop"}
    return {
        "text": text,  # caller decides whether to show original alongside
        "source": source,
        "target": target,
        "provider": "noop",
    }
