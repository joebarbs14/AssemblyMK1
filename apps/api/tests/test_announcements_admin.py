from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Council, User, UserRole, UserStatus


def _auth(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


def _login(client: TestClient, *, email: str) -> str:
    r = client.post(
        "/api/auth/password/login",
        json={"email": email, "password": "Sup3rStrongPassw0rd!"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _make_admin(db: Session, council: Council, email: str) -> User:
    u = User(
        council_id=council.id,
        email=email,
        name="Admin",
        password_hash=hash_password("Sup3rStrongPassw0rd!"),
        role=UserRole.admin.value,
        status=UserStatus.active.value,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_announcement_publish_then_visible_to_residents(
    client: TestClient, resident: tuple[User, str], staff_user: tuple[User, str],
) -> None:
    _, resident_token = resident
    _staff, staff_token = staff_user

    created = client.post(
        "/api/staff/announcements",
        headers=_auth(staff_token),
        json={"title": "Pool closed Saturday", "body_markdown": "Annual maintenance.", "audience": "council"},
    )
    assert created.status_code == 201, created.text
    ann_id = created.json()["id"]
    assert created.json()["status"] == "draft"

    # Resident shouldn't see a draft.
    feed = client.get("/api/announcements", headers=_auth(resident_token)).json()
    assert all(a["id"] != ann_id for a in feed)

    pub = client.post(
        f"/api/staff/announcements/{ann_id}/publish", headers=_auth(staff_token)
    )
    assert pub.status_code == 200
    assert pub.json()["status"] == "published"

    # Now resident sees it.
    feed2 = client.get("/api/announcements", headers=_auth(resident_token)).json()
    assert any(a["title"] == "Pool closed Saturday" for a in feed2)


def test_resident_cannot_use_staff_announcement_endpoints(
    client: TestClient, resident: tuple[User, str],
) -> None:
    _, t = resident
    r = client.post(
        "/api/staff/announcements",
        headers=_auth(t),
        json={"title": "Sneaky", "body_markdown": "..."},
    )
    assert r.status_code == 403


def test_admin_invite_user_and_audit_logged(
    client: TestClient, db: Session, council: Council,
) -> None:
    admin = _make_admin(db, council, "admin@example.com")
    token = _login(client, email=admin.email)

    r = client.post(
        "/api/admin/users",
        headers=_auth(token),
        json={"email": "newbie@example.com", "name": "Newbie", "role": "staff"},
    )
    assert r.status_code == 201
    invited = r.json()
    assert invited["status"] == "invited"

    # Audit log contains the invite.
    audit = client.get("/api/admin/audit", headers=_auth(token)).json()
    assert any(e["action"] == "user.invite" for e in audit)


def test_admin_category_crud(
    client: TestClient, db: Session, council: Council,
) -> None:
    admin = _make_admin(db, council, "admin@example.com")
    token = _login(client, email=admin.email)

    create = client.post(
        "/api/admin/categories",
        headers=_auth(token),
        json={
            "key": "lost_pet",
            "label": "Lost pet",
            "sla_hours": 24,
            "requires_photo": True,
        },
    )
    assert create.status_code == 201, create.text
    cat = create.json()
    assert cat["key"] == "lost_pet"

    patch = client.patch(
        f"/api/admin/categories/{cat['id']}",
        headers=_auth(token),
        json={"sla_hours": 12, "label": "Lost pet (urgent)"},
    )
    assert patch.status_code == 200
    assert patch.json()["sla_hours"] == 12
    assert patch.json()["label"] == "Lost pet (urgent)"


def test_non_admin_cannot_access_admin(
    client: TestClient, resident: tuple[User, str], staff_user: tuple[User, str],
) -> None:
    _, resident_token = resident
    _, staff_token = staff_user
    assert client.get("/api/admin/users", headers=_auth(resident_token)).status_code == 403
    assert client.get("/api/admin/users", headers=_auth(staff_token)).status_code == 403


def test_account_export_returns_user_data(
    client: TestClient, resident: tuple[User, str],
) -> None:
    _, token = resident
    r = client.get("/api/account/export", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["email"] == "alice@example.com"
    assert "reports" in body
    assert "properties" in body
    assert "payments" in body


def test_account_delete_disables_user(
    client: TestClient, resident: tuple[User, str], db: Session,
) -> None:
    _, token = resident
    r = client.delete("/api/account/delete", headers=_auth(token))
    assert r.status_code == 204

    # Subsequent /me should 401 (status != active).
    me = client.get("/api/auth/me", headers=_auth(token))
    assert me.status_code == 401
