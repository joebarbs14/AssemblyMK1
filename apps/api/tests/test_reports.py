from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ReportCategory, StaffTeam, User


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_list_categories(
    client: TestClient,
    resident: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, token = resident
    r = client.get("/api/reports/categories", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["key"] == "pothole"


def test_create_report_routes_to_team(
    client: TestClient,
    resident: tuple[User, str],
    pothole_category: ReportCategory,
    roads_team: StaffTeam,
    db: Session,
) -> None:
    _, token = resident
    r = client.post(
        "/api/reports",
        headers=_auth(token),
        json={
            "category_id": pothole_category.id,
            "title": "Big pothole on Main St",
            "description": "Near the bus stop",
            "lat": -33.8688,
            "lng": 151.2093,
            "address_text": "Main St, Sydney",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["team_id"] == roads_team.id
    assert body["team_name"] == "Roads"
    assert body["status"] == "assigned"  # auto-routed
    assert body["sla_due_at"] is not None

    rep_id = body["id"]
    # Auto-routing emits an internal assignment event; resident shouldn't see it.
    rev = client.get(f"/api/reports/{rep_id}/events", headers=_auth(token))
    assert rev.status_code == 200
    assert rev.json() == []  # no public events yet


def test_resident_cannot_see_other_residents_report(
    client: TestClient,
    resident: tuple[User, str],
    pothole_category: ReportCategory,
    db: Session,
) -> None:
    _, alice_token = resident
    r = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Alice's report"},
    )
    rep_id = r.json()["id"]

    # Register Bob
    r2 = client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "name": "Bob", "password": "Sup3rStrongPassw0rd!"},
    )
    bob_token = r2.json()["access_token"]

    rb = client.get(f"/api/reports/{rep_id}", headers=_auth(bob_token))
    assert rb.status_code == 404


def test_requires_photo_enforced(
    client: TestClient,
    resident: tuple[User, str],
    db: Session,
    pothole_category: ReportCategory,
) -> None:
    pothole_category.requires_photo = True
    db.commit()
    _, token = resident
    r = client.post(
        "/api/reports",
        headers=_auth(token),
        json={"category_id": pothole_category.id, "title": "No photo"},
    )
    assert r.status_code == 400

    # With attachment_keys, allowed.
    r2 = client.post(
        "/api/reports",
        headers=_auth(token),
        json={
            "category_id": pothole_category.id,
            "title": "With photo",
            "attachment_keys": ["dev/fake-photo.jpg"],
        },
    )
    assert r2.status_code == 201


def test_resident_can_post_message_event(
    client: TestClient,
    resident: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, token = resident
    r = client.post(
        "/api/reports",
        headers=_auth(token),
        json={"category_id": pothole_category.id, "title": "Need updates"},
    )
    rep_id = r.json()["id"]

    rm = client.post(
        f"/api/reports/{rep_id}/events",
        headers=_auth(token),
        json={"kind": "message", "body": "Any update?"},
    )
    assert rm.status_code == 201
    assert rm.json()["body"] == "Any update?"

    events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(token)).json()
    assert len(events) == 1
    assert events[0]["kind"] == "message"
    assert events[0]["internal"] is False


def test_staff_inbox_visibility_and_role_gate(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Pothole 1"},
    )

    # Resident hitting staff endpoint -> 403
    bad = client.get("/api/staff/reports", headers=_auth(alice_token))
    assert bad.status_code == 403

    # Staff sees the report
    _, staff_token = staff_user
    ok = client.get("/api/staff/reports", headers=_auth(staff_token))
    assert ok.status_code == 200
    body = ok.json()
    assert len(body) == 1
    assert body[0]["title"] == "Pothole 1"


def test_staff_status_change_emits_event_visible_to_resident(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    rep = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Update me"},
    ).json()
    rep_id = rep["id"]

    _, staff_token = staff_user
    r = client.post(
        f"/api/staff/reports/{rep_id}/events",
        headers=_auth(staff_token),
        json={"kind": "status_change", "metadata": {"to": "in_progress"}, "body": "On it."},
    )
    assert r.status_code == 201, r.text

    # Resident sees the status_change event (not internal).
    events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(alice_token)).json()
    kinds = [e["kind"] for e in events]
    assert "status_change" in kinds

    # And the report status is updated.
    detail = client.get(f"/api/reports/{rep_id}", headers=_auth(alice_token)).json()
    assert detail["status"] == "in_progress"


def test_staff_internal_note_hidden_from_resident(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    rep = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Secret note test"},
    ).json()
    rep_id = rep["id"]

    _, staff_token = staff_user
    client.post(
        f"/api/staff/reports/{rep_id}/events",
        headers=_auth(staff_token),
        json={"kind": "message", "body": "Internal: check duplicates first", "internal": True},
    )
    client.post(
        f"/api/staff/reports/{rep_id}/events",
        headers=_auth(staff_token),
        json={"kind": "message", "body": "Thanks for the report, we're looking into it."},
    )

    # Resident only sees the public message.
    res_events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(alice_token)).json()
    bodies = [e["body"] for e in res_events]
    assert "Internal: check duplicates first" not in bodies
    assert "Thanks for the report, we're looking into it." in bodies

    # Staff sees both.
    staff_events = client.get(
        f"/api/staff/reports/{rep_id}/events", headers=_auth(staff_token)
    ).json()
    assert len(staff_events) >= 2


def test_staff_assignment(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    rep_id = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Assign me"},
    ).json()["id"]

    staff, staff_token = staff_user
    r = client.post(
        f"/api/staff/reports/{rep_id}/events",
        headers=_auth(staff_token),
        json={"kind": "assignment", "metadata": {"to_user_id": staff.id}},
    )
    assert r.status_code == 201
    detail = client.get(f"/api/staff/reports/{rep_id}", headers=_auth(staff_token)).json()
    assert detail["assignee_user_id"] == staff.id


def test_file_request_flips_status_to_awaiting_resident(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    rep_id = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Photo missing"},
    ).json()["id"]

    _, staff_token = staff_user
    r = client.post(
        f"/api/staff/reports/{rep_id}/events",
        headers=_auth(staff_token),
        json={
            "kind": "file_request",
            "body": "Can you upload a clearer photo from the footpath side?",
        },
    )
    assert r.status_code == 201

    detail = client.get(f"/api/reports/{rep_id}", headers=_auth(alice_token)).json()
    assert detail["status"] == "awaiting_resident"

    # Resident sees the file_request (not internal).
    events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(alice_token)).json()
    assert any(e["kind"] == "file_request" for e in events)


def test_queue_summary(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    for i in range(3):
        client.post(
            "/api/reports",
            headers=_auth(alice_token),
            json={"category_id": pothole_category.id, "title": f"Pothole {i}"},
        )

    _, staff_token = staff_user
    r = client.get("/api/staff/reports/queues/summary", headers=_auth(staff_token))
    assert r.status_code == 200
    body = r.json()
    assert body["total_open"] == 3
    assert body["by_status"].get("assigned", 0) == 3  # auto-routed
    assert "Roads" in body["by_team"]


def test_patch_report_emits_multiple_events(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    rep_id = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Multi-patch"},
    ).json()["id"]

    staff, staff_token = staff_user
    r = client.patch(
        f"/api/staff/reports/{rep_id}",
        headers=_auth(staff_token),
        json={"status": "in_progress", "priority": "high", "assignee_user_id": staff.id},
    )
    assert r.status_code == 200
    events = client.get(
        f"/api/staff/reports/{rep_id}/events", headers=_auth(staff_token)
    ).json()
    kinds = [e["kind"] for e in events]
    # Should have: auto-route assignment + status_change + priority_change + reassign
    assert kinds.count("status_change") == 1
    assert kinds.count("priority_change") == 1
    assert kinds.count("assignment") >= 1
