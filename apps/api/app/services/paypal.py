"""PayPal Smart Checkout integration (Orders v2 + webhook verification).

Sandbox-friendly: when client_id/secret are blank, returns mock orders
so the resident pay flow is exercisable end-to-end locally. Real PayPal
calls go through httpx with the access-token cache.
"""
from __future__ import annotations

import logging
import secrets
import time
from typing import Any

import httpx

from app.core.config import settings

_log = logging.getLogger(__name__)

_token_cache: dict[str, Any] = {"value": None, "expires_at": 0.0}


def _base_url() -> str:
    return (
        "https://api-m.paypal.com"
        if settings.paypal_env == "live"
        else "https://api-m.sandbox.paypal.com"
    )


def is_configured() -> bool:
    return bool(settings.paypal_client_id and settings.paypal_client_secret)


async def _access_token() -> str:
    now = time.time()
    cached = _token_cache.get("value")
    if cached and _token_cache["expires_at"] > now + 30:
        return str(cached)

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"{_base_url()}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.paypal_client_id or "", settings.paypal_client_secret or ""),
            headers={"Accept": "application/json", "Accept-Language": "en_AU"},
        )
        r.raise_for_status()
        body = r.json()
    _token_cache["value"] = body["access_token"]
    _token_cache["expires_at"] = now + float(body.get("expires_in", 3600))
    return str(body["access_token"])


# ---- Mock helpers for dev/sandbox without creds ----


def _mock_order_id() -> str:
    return f"MOCK-{secrets.token_hex(6).upper()}"


def _mock_capture_id(order_id: str) -> str:
    return f"CAP-{order_id[-6:]}"


# ---- Public API ----


async def create_order(
    *,
    amount_cents: int,
    invoice_id: int,
    return_url: str,
    cancel_url: str,
    currency: str = "AUD",
) -> dict[str, Any]:
    """Returns {order_id, approve_url, mock: bool}."""
    if not is_configured():
        order_id = _mock_order_id()
        return {
            "order_id": order_id,
            "approve_url": f"{return_url}?token={order_id}&PayerID=MOCKPAYER&mock=1",
            "mock": True,
        }

    token = await _access_token()
    body = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": f"invoice-{invoice_id}",
                "amount": {"currency_code": currency, "value": f"{amount_cents / 100:.2f}"},
                "description": f"Council rates invoice #{invoice_id}",
            }
        ],
        "application_context": {
            "return_url": return_url,
            "cancel_url": cancel_url,
            "user_action": "PAY_NOW",
            "brand_name": "Assembly",
            "shipping_preference": "NO_SHIPPING",
        },
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{_base_url()}/v2/checkout/orders",
            json=body,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        order = r.json()

    approve = next((lnk["href"] for lnk in order.get("links", []) if lnk.get("rel") == "approve"), "")
    return {"order_id": order["id"], "approve_url": approve, "mock": False}


async def capture_order(order_id: str) -> dict[str, Any]:
    """Returns {capture_id, status, amount_cents, currency, payer_email, mock: bool}."""
    if not is_configured() or order_id.startswith("MOCK-"):
        return {
            "capture_id": _mock_capture_id(order_id),
            "order_id": order_id,
            "status": "COMPLETED",
            "amount_cents": 0,  # caller supplies the original amount
            "currency": "AUD",
            "payer_email": "[email protected]",
            "mock": True,
        }

    token = await _access_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{_base_url()}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        body = r.json()

    pu = body.get("purchase_units", [{}])[0]
    captures = pu.get("payments", {}).get("captures", [{}])
    cap = captures[0] if captures else {}
    amount = cap.get("amount", {})
    value = amount.get("value", "0.00")
    return {
        "capture_id": cap.get("id", ""),
        "order_id": body.get("id", order_id),
        "status": body.get("status", "UNKNOWN"),
        "amount_cents": int(round(float(value) * 100)),
        "currency": amount.get("currency_code", "AUD"),
        "payer_email": body.get("payer", {}).get("email_address"),
        "mock": False,
    }


async def verify_webhook(
    *, headers: dict[str, str], body_raw: bytes, event: dict[str, Any]
) -> bool:
    """Verifies a PayPal webhook signature against the configured webhook ID.

    Returns True in sandbox/no-creds mode (caller still verifies idempotency
    via the event_id), False on verification failure in prod.
    """
    if not is_configured() or not settings.paypal_webhook_id:
        return True
    token = await _access_token()
    payload = {
        "transmission_id": headers.get("paypal-transmission-id"),
        "transmission_time": headers.get("paypal-transmission-time"),
        "cert_url": headers.get("paypal-cert-url"),
        "auth_algo": headers.get("paypal-auth-algo"),
        "transmission_sig": headers.get("paypal-transmission-sig"),
        "webhook_id": settings.paypal_webhook_id,
        "webhook_event": event,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"{_base_url()}/v1/notifications/verify-webhook-signature",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        if r.status_code != 200:
            _log.warning("PayPal webhook verify HTTP %s: %s", r.status_code, r.text)
            return False
        return bool(r.json().get("verification_status") == "SUCCESS")
