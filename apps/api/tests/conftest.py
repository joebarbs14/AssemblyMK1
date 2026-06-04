from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.main import app
from app.models import Council


@pytest.fixture
def db_engine():
    # SQLite in-memory with shared cache so the same connection is reused.
    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _):  # type: ignore[no-untyped-def]
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(db_engine) -> Generator[Session, None, None]:
    TestSession = sessionmaker(bind=db_engine, autoflush=False, autocommit=False, future=True)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def council(db: Session) -> Council:
    c = Council(slug="demo", name="Demo Council", brand_color="#0B3D2E")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def client(db_engine, db: Session) -> Generator[TestClient, None, None]:
    TestSession = sessionmaker(bind=db_engine, autoflush=False, autocommit=False, future=True)

    def _override_get_db() -> Generator[Session, None, None]:
        s = TestSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        c.headers.update({"X-Council-Slug": "demo"})
        yield c
    app.dependency_overrides.clear()
