"""Web push device registration."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import Device, User
from app.services import push

router = APIRouter(tags=["devices"])


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeIn(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


class SubscribeOut(BaseModel):
    id: int
    endpoint: str


@router.get("/push/public-key")
def get_public_key() -> dict[str, str | None]:
    """Returns the VAPID public key the browser uses to subscribe.
    Returns null when push isn't configured so the client can show a
    'coming soon' hint instead of failing."""
    return {"public_key": push.vapid_public_key()}


@router.post("/devices/web-push", response_model=SubscribeOut, status_code=201)
def subscribe_web_push(
    body: SubscribeIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscribeOut:
    # Upsert by endpoint — re-registering the same browser updates last_seen.
    existing = (
        db.query(Device)
        .filter(Device.endpoint == body.endpoint)
        .one_or_none()
    )
    if existing is not None:
        existing.user_id = user.id
        existing.p256dh = body.keys.p256dh
        existing.auth_key = body.keys.auth
        existing.last_seen_at = datetime.now(UTC)
        existing.user_agent = (request.headers.get("user-agent") or "")[:255]
        db.commit()
        db.refresh(existing)
        return SubscribeOut(id=existing.id, endpoint=existing.endpoint)

    device = Device(
        user_id=user.id,
        endpoint=body.endpoint,
        p256dh=body.keys.p256dh,
        auth_key=body.keys.auth,
        user_agent=(request.headers.get("user-agent") or "")[:255],
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return SubscribeOut(id=device.id, endpoint=device.endpoint)


@router.delete("/devices/web-push", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_web_push(
    endpoint: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    d = (
        db.query(Device)
        .filter(Device.endpoint == endpoint, Device.user_id == user.id)
        .one_or_none()
    )
    if d is None:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(d)
    db.commit()
    return None
