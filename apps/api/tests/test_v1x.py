from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.models import User


def _auth(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


def test_demo_seed_populates_v1x_modules(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    seed = client.post("/api/rates/demo-seed", headers=_auth(token)).json()
    prop_id = seed["id"]

    animals = client.get("/api/animals", headers=_auth(token)).json()
    assert len(animals) >= 3
    assert {a["species"] for a in animals} >= {"dog", "cat"}

    das = client.get("/api/development", headers=_auth(token)).json()
    assert len(das) >= 3
    statuses = {d["status"] for d in das}
    assert "on_exhibition" in statuses

    water = client.get(
        f"/api/water/properties/{prop_id}", headers=_auth(token)
    ).json()
    assert len(water) == 4
    assert all(row["consumed_litres"] > 0 for row in water)

    waste = client.get("/api/waste", headers=_auth(token)).json()
    assert len(waste) >= 3
    assert any(w["collection_type"] == "recycling" for w in waste)


def test_animal_404_cross_tenant(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    r = client.get("/api/animals/99999", headers=_auth(token))
    assert r.status_code == 404


def test_water_property_ownership_enforced(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, alice = resident
    seed = client.post("/api/rates/demo-seed", headers=_auth(alice)).json()
    # Register Bob and try to read Alice's water.
    bob_reg = client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "name": "Bob", "password": "Sup3rStrongPassw0rd!"},
    )
    bob_token = bob_reg.json()["access_token"]
    bad = client.get(
        f"/api/water/properties/{seed['id']}", headers=_auth(bob_token)
    )
    assert bad.status_code == 404


def test_appointment_full_lifecycle(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category,
) -> None:
    _, alice = resident
    _staff, staff_token = staff_user
    rep_id = client.post(
        "/api/reports",
        headers=_auth(alice),
        json={"category_id": pothole_category.id, "title": "Need a visit"},
    ).json()["id"]

    now = datetime.now(UTC)
    propose = client.post(
        f"/api/staff/reports/{rep_id}/appointments",
        headers=_auth(staff_token),
        json={
            "slot_start": (now + timedelta(days=2)).isoformat(),
            "slot_end": (now + timedelta(days=2, hours=1)).isoformat(),
            "location_text": "12 Sample St",
            "notes": "Site inspection",
        },
    )
    assert propose.status_code == 201, propose.text
    appt = propose.json()
    assert appt["status"] == "proposed"

    confirm = client.post(
        f"/api/reports/{rep_id}/appointments/{appt['id']}/confirm",
        headers=_auth(alice),
    )
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "confirmed"
    assert confirm.json()["confirmed_at"] is not None

    complete = client.post(
        f"/api/staff/reports/{rep_id}/appointments/{appt['id']}/complete",
        headers=_auth(staff_token),
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"

    # Timeline contains all three appointment events.
    events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(alice)).json()
    kinds = [e["kind"] for e in events]
    assert "appointment_proposed" in kinds
    assert "appointment_confirmed" in kinds
    assert "appointment_completed" in kinds


def test_signature_request_and_provide(
    client: TestClient,
    resident: tuple[User, str],
    staff_user: tuple[User, str],
    pothole_category,
) -> None:
    _, alice = resident
    _staff, staff_token = staff_user
    rep_id = client.post(
        "/api/reports",
        headers=_auth(alice),
        json={"category_id": pothole_category.id, "title": "Sign-off please"},
    ).json()["id"]

    req = client.post(
        f"/api/staff/reports/{rep_id}/signatures/request",
        headers=_auth(staff_token),
        json={"kind": "resident_acknowledge"},
    )
    assert req.status_code == 204

    provide = client.post(
        f"/api/reports/{rep_id}/signatures",
        headers=_auth(alice),
        json={"attachment_id": None},
    )
    assert provide.status_code == 201
    assert provide.json()["kind"] == "resident_acknowledge"

    events = client.get(f"/api/reports/{rep_id}/events", headers=_auth(alice)).json()
    kinds = [e["kind"] for e in events]
    assert "signature_requested" in kinds
    assert "signature_provided" in kinds


def test_resident_cannot_propose_appointments(
    client: TestClient, resident: tuple[User, str], pothole_category
) -> None:
    _, alice = resident
    rep_id = client.post(
        "/api/reports", headers=_auth(alice),
        json={"category_id": pothole_category.id, "title": "Cheeky"},
    ).json()["id"]
    now = datetime.now(UTC)
    r = client.post(
        f"/api/staff/reports/{rep_id}/appointments",
        headers=_auth(alice),
        json={
            "slot_start": (now + timedelta(days=1)).isoformat(),
            "slot_end": (now + timedelta(days=1, hours=1)).isoformat(),
        },
    )
    assert r.status_code == 403
