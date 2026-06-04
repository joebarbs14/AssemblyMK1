from __future__ import annotations

import importlib

import pytest


@pytest.mark.parametrize(
    "incoming,expected",
    [
        ("postgresql://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgres://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite:///:memory:", "sqlite:///:memory:"),
    ],
)
def test_database_url_normalisation(
    monkeypatch: pytest.MonkeyPatch, incoming: str, expected: str
) -> None:
    """Render's $DATABASE_URL uses postgresql://. We use psycopg v3, so
    SQLAlchemy needs the +psycopg dialect — config.py normalises both
    legacy schemes."""
    monkeypatch.setenv("DATABASE_URL", incoming)
    # Re-import to pick up the env var.
    import app.core.config as config

    importlib.reload(config)
    assert config.settings.database_url == expected
