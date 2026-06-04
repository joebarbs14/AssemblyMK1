from __future__ import annotations

from fastapi.testclient import TestClient

from app.models import User


def _auth(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


def _seeded_invoice(client: TestClient, token: str) -> tuple[int, int, int]:
    """Returns (property_id, invoice_id, amount_cents) using the demo seed."""
    prop = client.post("/api/rates/demo-seed", headers=_auth(token)).json()
    invs = client.get(
        f"/api/rates/properties/{prop['id']}/invoices", headers=_auth(token)
    ).json()
    issued = next(i for i in invs if i["status"] == "issued")
    return prop["id"], issued["id"], issued["amount_cents"]


def test_paypal_create_order_mock_when_unconfigured(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    _prop_id, invoice_id, amount = _seeded_invoice(client, token)

    r = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mock"] is True
    assert body["order_id"].startswith("MOCK-")
    assert "approve_url" in body
    assert body["invoice_id"] == invoice_id
    assert body["amount_cents"] == amount


def test_paypal_capture_marks_invoice_paid_and_reduces_balance(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    prop_id, invoice_id, amount = _seeded_invoice(client, token)

    # Initial balance
    before = client.get(f"/api/rates/properties/{prop_id}", headers=_auth(token)).json()
    starting_balance = before["account"]["balance_cents"]

    order = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    ).json()
    cap = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-capture",
        headers=_auth(token),
        json={"order_id": order["order_id"]},
    )
    assert cap.status_code == 200, cap.text
    payment = cap.json()
    assert payment["status"] == "succeeded"
    assert payment["provider"] == "paypal"
    assert payment["amount_cents"] == amount
    assert payment["paid_at"] is not None

    # Invoice flipped to paid.
    inv = client.get(f"/api/rates/invoices/{invoice_id}", headers=_auth(token)).json()
    assert inv["status"] == "paid"

    # Balance reduced.
    after = client.get(f"/api/rates/properties/{prop_id}", headers=_auth(token)).json()
    assert after["account"]["balance_cents"] == max(0, starting_balance - amount)


def test_paypal_capture_idempotent(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    _prop_id, invoice_id, _ = _seeded_invoice(client, token)
    order = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    ).json()
    cap1 = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-capture",
        headers=_auth(token),
        json={"order_id": order["order_id"]},
    ).json()
    cap2 = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-capture",
        headers=_auth(token),
        json={"order_id": order["order_id"]},
    ).json()
    assert cap1["id"] == cap2["id"]
    assert cap1["status"] == cap2["status"] == "succeeded"


def test_paypal_capture_rejects_already_paid_invoice(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    _prop_id, invoice_id, _ = _seeded_invoice(client, token)
    order = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    ).json()
    client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-capture",
        headers=_auth(token),
        json={"order_id": order["order_id"]},
    )
    # Trying to create a second order for a now-paid invoice -> 400.
    r = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    )
    assert r.status_code == 400


def test_payments_history(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    prop_id, invoice_id, _ = _seeded_invoice(client, token)
    order = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    ).json()
    client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-capture",
        headers=_auth(token),
        json={"order_id": order["order_id"]},
    )

    r = client.get(
        f"/api/rates/properties/{prop_id}/payments", headers=_auth(token)
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["provider"] == "paypal"
    assert rows[0]["status"] == "succeeded"


def test_paypal_webhook_idempotent_and_updates_payment(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, token = resident
    _prop_id, invoice_id, amount = _seeded_invoice(client, token)
    order = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(token)
    ).json()

    event = {
        "id": "WH-EVT-123",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {
            "supplementary_data": {"related_ids": {"order_id": order["order_id"]}},
            "amount": {"value": f"{amount / 100:.2f}", "currency_code": "AUD"},
        },
    }
    r1 = client.post("/api/webhooks/paypal", json=event)
    assert r1.status_code == 204
    r2 = client.post("/api/webhooks/paypal", json=event)
    assert r2.status_code == 204  # idempotent — second delivery is a no-op

    inv = client.get(f"/api/rates/invoices/{invoice_id}", headers=_auth(token)).json()
    assert inv["status"] == "paid"


def test_paypal_order_other_resident_404(
    client: TestClient, resident: tuple[User, str]
) -> None:
    _, alice_token = resident
    _prop_id, invoice_id, _ = _seeded_invoice(client, alice_token)
    r = client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "name": "Bob", "password": "Sup3rStrongPassw0rd!"},
    )
    bob_token = r.json()["access_token"]
    bad = client.post(
        f"/api/rates/invoices/{invoice_id}/paypal-order", headers=_auth(bob_token)
    )
    assert bad.status_code == 404
