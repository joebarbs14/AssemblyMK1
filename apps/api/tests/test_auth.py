from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import issue_magic_link_token
from app.models import Council, User


def _register_user(client: TestClient, *, email: str = "alice@example.com") -> str:
    r = client.post(
        "/api/auth/register",
        json={"email": email, "name": "Alice", "password": "Sup3rStrongPassw0rd!"},
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def test_register_and_me(client: TestClient, council: Council) -> None:
    token = _register_user(client)
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert body["role"] == "resident"
    assert body["council"]["slug"] == "demo"


def test_register_duplicate_rejected(client: TestClient, council: Council) -> None:
    _register_user(client)
    r = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "name": "Alice", "password": "Sup3rStrongPassw0rd!"},
    )
    assert r.status_code == 409


def test_password_login_success_and_failure(client: TestClient, council: Council) -> None:
    _register_user(client)
    ok = client.post(
        "/api/auth/password/login",
        json={"email": "alice@example.com", "password": "Sup3rStrongPassw0rd!"},
    )
    assert ok.status_code == 200
    assert "access_token" in ok.json()

    bad = client.post(
        "/api/auth/password/login",
        json={"email": "alice@example.com", "password": "wrong-password-1234"},
    )
    assert bad.status_code == 401

    nope = client.post(
        "/api/auth/password/login",
        json={"email": "ghost@example.com", "password": "whateverlong12"},
    )
    assert nope.status_code == 401  # don't leak existence


def test_me_requires_bearer(client: TestClient, council: Council) -> None:
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_magic_link_request_always_202(client: TestClient, council: Council) -> None:
    _register_user(client)
    for email in ("alice@example.com", "ghost@example.com"):
        r = client.post("/api/auth/magic-link", json={"email": email})
        assert r.status_code == 202
        assert r.json() == {"status": "ok"}


def test_magic_link_verify_full_flow(client: TestClient, council: Council, db: Session) -> None:
    _register_user(client)
    user = db.query(User).filter(User.email == "alice@example.com").one()
    token = issue_magic_link_token({"uid": user.id, "cid": council.id, "jti": "abc123token"})

    r = client.post("/api/auth/magic-link/verify", json={"token": token})
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()

    # Second use of same token must be rejected (single-use).
    r2 = client.post("/api/auth/magic-link/verify", json={"token": token})
    assert r2.status_code == 400


def test_magic_link_wrong_council_rejected(client: TestClient, council: Council, db: Session) -> None:
    # User in council 'demo', token claims council id 999.
    _register_user(client)
    user = db.query(User).filter(User.email == "alice@example.com").one()
    token = issue_magic_link_token({"uid": user.id, "cid": 999, "jti": "wrongcouncil-jti"})
    r = client.post("/api/auth/magic-link/verify", json={"token": token})
    assert r.status_code == 400


def test_tenant_missing_returns_400(client: TestClient) -> None:
    client.headers.pop("X-Council-Slug", None)
    r = client.post(
        "/api/auth/register",
        json={"email": "x@example.com", "name": "X", "password": "Sup3rStrongPassw0rd!"},
    )
    assert r.status_code == 400


def test_unknown_council_returns_404(client: TestClient) -> None:
    client.headers["X-Council-Slug"] = "nonexistent"
    r = client.post(
        "/api/auth/register",
        json={"email": "x@example.com", "name": "X", "password": "Sup3rStrongPassw0rd!"},
    )
    assert r.status_code == 404
