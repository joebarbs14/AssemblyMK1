from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models import (
    Council,
    ReportCategory,
    StaffTeam,
    User,
    UserRole,
    UserStatus,
)


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


def _bearer(client: TestClient, *, email: str, password: str) -> str:
    r = client.post(
        "/api/auth/password/login",
        json={"email": email, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def resident(client: TestClient, council: Council) -> tuple[User, str]:
    r = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "name": "Alice", "password": "Sup3rStrongPassw0rd!"},
    )
    assert r.status_code == 201
    token = r.json()["access_token"]
    from app.models import User as U
    db_session = next(app.dependency_overrides[get_db]())
    user = db_session.query(U).filter(U.email == "alice@example.com").one()
    db_session.close()
    return user, token


@pytest.fixture
def staff_user(db: Session, council: Council, client: TestClient) -> tuple[User, str]:
    u = User(
        council_id=council.id,
        email="staffer@example.com",
        name="Staffer",
        password_hash=hash_password("Sup3rStrongPassw0rd!"),
        role=UserRole.staff.value,
        status=UserStatus.active.value,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = _bearer(client, email="staffer@example.com", password="Sup3rStrongPassw0rd!")
    return u, token


@pytest.fixture
def roads_team(db: Session, council: Council) -> StaffTeam:
    t = StaffTeam(council_id=council.id, name="Roads")
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def pothole_category(db: Session, council: Council, roads_team: StaffTeam) -> ReportCategory:
    c = ReportCategory(
        council_id=council.id,
        key="pothole",
        label="Pothole",
        icon="hole",
        sla_hours=72,
        default_team_id=roads_team.id,
        requires_photo=False,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c
