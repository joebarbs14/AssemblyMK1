from __future__ import annotations

from fastapi.testclient import TestClient

from app.models import ReportCategory, User


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_presign_returns_dev_stub_when_r2_not_configured(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    r = client.post(
        "/api/reports/attachments/presign",
        headers=_auth(token),
        json={"mime": "image/jpeg"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["key"].startswith("c")
    assert body["key"].endswith(".jpg")
    assert body["url"].startswith("/api/dev/upload/")
    assert body["method"] == "PUT"


def test_presign_rejects_non_media_mime(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    r = client.post(
        "/api/reports/attachments/presign",
        headers=_auth(token),
        json={"mime": "text/html"},
    )
    assert r.status_code == 400


def test_dev_upload_stub_accepts_put(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    pre = client.post(
        "/api/reports/attachments/presign",
        headers=_auth(token),
        json={"mime": "image/jpeg"},
    ).json()
    put = client.put(pre["url"], content=b"\xff\xd8\xff\xe0fake")
    assert put.status_code == 204


def test_attach_to_existing_after_file_request_resolves_status(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    _, staff_token = staff_user

    # File a report.
    rep = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Need more info"},
    ).json()
    rep_id = rep["id"]

    # Staff: file_request flips status to awaiting_resident.
    fr = client.post(
        f"/api/staff/reports/{rep_id}/events",
        headers=_auth(staff_token),
        json={"kind": "file_request", "body": "Photo of the south side please"},
    ).json()

    detail = client.get(f"/api/reports/{rep_id}", headers=_auth(alice_token)).json()
    assert detail["status"] == "awaiting_resident"

    # Resident attaches in response to that file_request.
    att = client.post(
        f"/api/reports/{rep_id}/attachments",
        headers=_auth(alice_token),
        json={"r2_key": "c1/2026/06/u1/abc.jpg", "mime": "image/jpeg", "in_response_to_event_id": fr["id"]},
    )
    assert att.status_code == 201

    # Status auto-flips back to in_progress, attachment_added event visible.
    detail2 = client.get(f"/api/reports/{rep_id}", headers=_auth(alice_token)).json()
    assert detail2["status"] == "in_progress"
    events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(alice_token)).json()
    kinds = [e["kind"] for e in events]
    assert "attachment_added" in kinds


def test_attach_with_bad_event_id_rejected(
    client: TestClient,
    resident: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    _, alice_token = resident
    rep_id = client.post(
        "/api/reports",
        headers=_auth(alice_token),
        json={"category_id": pothole_category.id, "title": "Wrong event ref"},
    ).json()["id"]
    r = client.post(
        f"/api/reports/{rep_id}/attachments",
        headers=_auth(alice_token),
        json={"r2_key": "c1/x.jpg", "in_response_to_event_id": 99999},
    )
    assert r.status_code == 400


def test_pubsub_publishes_on_event(
    client: TestClient,
    resident: tuple[User, str],
    pothole_category: ReportCategory,
) -> None:
    """Verifies append_event drops a message on the in-process broker."""
    from app.services import events_pubsub

    _, token = resident
    rep_id = client.post(
        "/api/reports",
        headers=_auth(token),
        json={"category_id": pothole_category.id, "title": "Pubsub check"},
    ).json()["id"]

    q = events_pubsub.subscribe(rep_id)
    try:
        # Post a message via API; broker should publish.
        client.post(
            f"/api/reports/{rep_id}/events",
            headers=_auth(token),
            json={"kind": "message", "body": "Hello"},
        )
        # The publish is sync within the request — should be immediately available.
        assert not q.empty()
        import json as j

        msg = j.loads(q.get_nowait())
        assert msg["kind"] == "message"
        assert msg["body"] == "Hello"
    finally:
        events_pubsub.unsubscribe(rep_id, q)
