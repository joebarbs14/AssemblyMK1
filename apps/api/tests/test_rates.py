from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Council, User
from app.services.rates import _mod10_v01, make_crn


def _auth(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


def test_crn_check_digit_is_deterministic_single_digit() -> None:
    out = _mod10_v01("12345678")
    assert len(out) == 1 and out.isdigit()
    # Deterministic across calls.
    assert _mod10_v01("12345678") == out


def test_make_crn_is_10_digits_and_valid() -> None:
    crn = make_crn(1234)
    assert len(crn) == 10
    assert crn.isdigit()
    assert _mod10_v01(crn[:-1]) == crn[-1]


def test_no_properties_for_new_user(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    r = client.get("/api/rates/properties", headers=_auth(token))
    assert r.status_code == 200
    assert r.json() == []


def test_demo_seed_idempotent(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    r1 = client.post("/api/rates/demo-seed", headers=_auth(token))
    assert r1.status_code == 201
    rid1 = r1.json()["id"]
    r2 = client.post("/api/rates/demo-seed", headers=_auth(token))
    assert r2.status_code == 201
    assert r2.json()["id"] == rid1


def test_property_detail_returns_rich_block(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    seed = client.post("/api/rates/demo-seed", headers=_auth(token)).json()
    r = client.get(f"/api/rates/properties/{seed['id']}", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["account"]["balance_cents"] == 145000
    assert body["account"]["ebilling_enabled"] is True
    assert len(body["valuations"]) == 3
    assert len(body["rate_charges"]) >= 3
    assert body["waste_entitlement"]["bin_size_l"] == 240
    assert any(o["kind"] == "flood" for o in body["overlays"])
    assert body["billing_setting"]["ebill_active"] is True


def test_invoices_list_in_descending_issue_date(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    seed = client.post("/api/rates/demo-seed", headers=_auth(token)).json()
    r = client.get(f"/api/rates/properties/{seed['id']}/invoices", headers=_auth(token))
    assert r.status_code == 200
    inv = r.json()
    assert len(inv) == 3
    dates = [i["issue_date"] for i in inv]
    assert dates == sorted(dates, reverse=True)
    statuses = [i["status"] for i in inv]
    assert statuses[0] == "issued"  # newest is the unpaid one


def test_get_invoice_owner_check(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, alice_token = resident
    seed = client.post("/api/rates/demo-seed", headers=_auth(alice_token)).json()
    inv = client.get(
        f"/api/rates/properties/{seed['id']}/invoices", headers=_auth(alice_token)
    ).json()[0]

    # Bob (different resident, same council) — must NOT see Alice's invoice.
    r = client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "name": "Bob", "password": "Sup3rStrongPassw0rd!"},
    )
    bob_token = r.json()["access_token"]
    bad = client.get(f"/api/rates/invoices/{inv['id']}", headers=_auth(bob_token))
    assert bad.status_code == 404


def test_property_cross_tenant_isolation(
    client: TestClient,
    resident: tuple[User, str],
    db: Session,
) -> None:
    _, alice_token = resident
    seed = client.post("/api/rates/demo-seed", headers=_auth(alice_token)).json()

    # Create a second council; register a user there; that user shouldn't see Alice's property.
    other = Council(slug="other", name="Other Council", brand_color="#000000")
    db.add(other)
    db.commit()

    other_client_headers = {"X-Council-Slug": "other"}
    r = client.post(
        "/api/auth/register",
        headers=other_client_headers,
        json={"email": "eve@example.com", "name": "Eve", "password": "Sup3rStrongPassw0rd!"},
    )
    eve_token = r.json()["access_token"]
    bad = client.get(
        f"/api/rates/properties/{seed['id']}",
        headers={**_auth(eve_token), **other_client_headers},
    )
    assert bad.status_code == 404


def test_bpay_endpoint_generates_and_reuses_crn(
    client: TestClient,
    resident: tuple[User, str],
    db: Session,
) -> None:
    _, token = resident
    council = db.query(Council).filter(Council.slug == "demo").one()
    council.bpay_biller_code = "454321"
    db.commit()

    seed = client.post("/api/rates/demo-seed", headers=_auth(token)).json()
    r1 = client.get(f"/api/rates/properties/{seed['id']}/bpay", headers=_auth(token))
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["biller_code"] == "454321"
    assert len(body1["crn"]) == 10
    assert body1["deep_link"].startswith("bpay://?biller=454321&ref=")

    # Second call: same CRN (idempotent).
    r2 = client.get(f"/api/rates/properties/{seed['id']}/bpay", headers=_auth(token))
    assert r2.json()["crn"] == body1["crn"]


def test_invoice_404_for_nonexistent(
    client: TestClient,
    resident: tuple[User, str],
) -> None:
    _, token = resident
    r = client.get("/api/rates/invoices/99999", headers=_auth(token))
    assert r.status_code == 404
