"""V3 endpoints: webhooks, grants browser, asset register, road closures,
identity verification, accessibility settings, languages, land hire,
citizen sensors, predictive analytics."""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Asset,
    GrantOpportunity,
    IdentityVerification,
    LandHireBooking,
    LandHireResource,
    RoadClosure,
    SensorReading,
    User,
    UserPreference,
    UserRole,
    WebhookSubscription,
)
from app.services import prediction

router = APIRouter(tags=["council-v3"])
public_router = APIRouter(prefix="/public", tags=["council-v3-public"])


def _admin(user: User) -> None:
    if user.role != UserRole.admin.value:
        raise HTTPException(status_code=403, detail="Admin only")


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ #1 Webhooks ============


class WebhookIn(BaseModel):
    url: str = Field(min_length=8, max_length=500)
    event_types: list[str]  # ["*"] or specific


class WebhookOut(BaseModel):
    id: int
    url: str
    secret: str
    event_types: list[str]
    active: bool
    last_status: int | None


@router.get("/admin/webhooks", response_model=list[WebhookOut])
def list_webhooks(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[WebhookOut]:
    _admin(user)
    rows = (
        db.query(WebhookSubscription)
        .filter(WebhookSubscription.council_id == user.council_id)
        .all()
    )
    return [
        WebhookOut(id=w.id, url=w.url, secret=w.secret, event_types=w.event_types,
                   active=w.active, last_status=w.last_status)
        for w in rows
    ]


@router.post("/admin/webhooks", response_model=WebhookOut, status_code=201)
def create_webhook(body: WebhookIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> WebhookOut:
    _admin(user)
    w = WebhookSubscription(
        council_id=user.council_id, url=body.url, event_types=body.event_types,
        secret=secrets.token_urlsafe(32), active=True,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return WebhookOut(id=w.id, url=w.url, secret=w.secret, event_types=w.event_types,
                      active=w.active, last_status=w.last_status)


@router.delete("/admin/webhooks/{wid}", status_code=204)
def delete_webhook(wid: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> None:
    _admin(user)
    w = db.get(WebhookSubscription, wid)
    if w is None or w.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(w)
    db.commit()


# ============ #2 Grants browser ============


class GrantOpportunityOut(BaseModel):
    id: int
    source: str
    title: str
    description: str
    min_amount_cents: int | None
    max_amount_cents: int | None
    closes_at: date | None
    url: str | None
    eligibility: str | None


@router.get("/grants/opportunities", response_model=list[GrantOpportunityOut])
def list_opportunities(user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> list[GrantOpportunityOut]:
    today = date.today()
    rows = (
        db.query(GrantOpportunity)
        .filter(
            or_(GrantOpportunity.council_id == user.council_id,
                GrantOpportunity.council_id.is_(None)),
            or_(GrantOpportunity.closes_at.is_(None),
                GrantOpportunity.closes_at >= today),
        )
        .order_by(GrantOpportunity.closes_at.asc().nullslast())
        .limit(50)
        .all()
    )
    return [
        GrantOpportunityOut(
            id=g.id, source=g.source, title=g.title, description=g.description,
            min_amount_cents=g.min_amount_cents, max_amount_cents=g.max_amount_cents,
            closes_at=g.closes_at, url=g.url, eligibility=g.eligibility,
        )
        for g in rows
    ]


# ============ #3 Asset register ============


class AssetOut(BaseModel):
    id: int
    kind: str
    label: str
    qr_payload: str
    lat: float | None
    lng: float | None
    address_text: str | None
    status: str
    last_inspected_at: date | None


@router.get("/assets", response_model=list[AssetOut])
def list_assets(
    kind: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssetOut]:
    q = db.query(Asset).filter(Asset.council_id == user.council_id)
    if kind:
        q = q.filter(Asset.kind == kind)
    rows = q.order_by(Asset.label).limit(200).all()
    return [
        AssetOut(id=a.id, kind=a.kind, label=a.label, qr_payload=a.qr_payload,
                 lat=a.lat, lng=a.lng, address_text=a.address_text, status=a.status,
                 last_inspected_at=a.last_inspected_at)
        for a in rows
    ]


@public_router.get("/assets/{qr}", response_model=AssetOut)
def get_asset_by_qr(qr: str, db: Session = Depends(get_db)) -> AssetOut:
    a = db.query(Asset).filter(Asset.qr_payload == qr).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return AssetOut(id=a.id, kind=a.kind, label=a.label, qr_payload=a.qr_payload,
                    lat=a.lat, lng=a.lng, address_text=a.address_text, status=a.status,
                    last_inspected_at=a.last_inspected_at)


# ============ #4 Road closures ============


class RoadClosureOut(BaseModel):
    id: int
    title: str
    description: str | None
    lat_from: float
    lng_from: float
    lat_to: float | None
    lng_to: float | None
    starts_at: datetime
    ends_at: datetime
    severity: str
    detour: str | None


@router.get("/road-closures", response_model=list[RoadClosureOut])
def list_closures(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[RoadClosureOut]:
    now = datetime.now(UTC)
    rows = (
        db.query(RoadClosure)
        .filter(
            RoadClosure.council_id == user.council_id,
            RoadClosure.ends_at >= now,
        )
        .order_by(RoadClosure.starts_at)
        .all()
    )
    return [
        RoadClosureOut(
            id=r.id, title=r.title, description=r.description,
            lat_from=r.lat_from, lng_from=r.lng_from,
            lat_to=r.lat_to, lng_to=r.lng_to,
            starts_at=r.starts_at, ends_at=r.ends_at,
            severity=r.severity, detour=r.detour,
        )
        for r in rows
    ]


# ============ #5 Identity verification ============


class VerifyIn(BaseModel):
    provider: str = Field(pattern="^(service_nsw|auspost_digital_id|local)$")


class VerifyOut(BaseModel):
    provider: str
    status: str
    verified_at: datetime


@router.post("/account/verify-identity", response_model=VerifyOut, status_code=201)
def verify_identity(body: VerifyIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> VerifyOut:
    """Mock verification — in production POSTs to the provider's OIDC.
    For dev/demo just records the link."""
    existing = (
        db.query(IdentityVerification)
        .filter(IdentityVerification.user_id == user.id,
                IdentityVerification.provider == body.provider)
        .first()
    )
    if existing is not None:
        return VerifyOut(provider=existing.provider, status=existing.status,
                         verified_at=existing.verified_at)
    v = IdentityVerification(user_id=user.id, provider=body.provider, status="verified")
    db.add(v)
    db.commit()
    db.refresh(v)
    return VerifyOut(provider=v.provider, status=v.status, verified_at=v.verified_at)


@router.get("/account/verifications", response_model=list[VerifyOut])
def list_verifications(user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> list[VerifyOut]:
    rows = (
        db.query(IdentityVerification)
        .filter(IdentityVerification.user_id == user.id)
        .all()
    )
    return [VerifyOut(provider=v.provider, status=v.status, verified_at=v.verified_at) for v in rows]


# ============ #6 + #7 Preferences ============


class PrefsIn(BaseModel):
    language: str | None = Field(default=None, pattern="^(en|zh|ar|vi|pa|el)$")
    high_contrast: bool | None = None
    dyslexia_font: bool | None = None
    larger_text: bool | None = None
    reduced_motion: bool | None = None


class PrefsOut(BaseModel):
    language: str
    high_contrast: bool
    dyslexia_font: bool
    larger_text: bool
    reduced_motion: bool


def _get_or_make_prefs(db: Session, user: User) -> UserPreference:
    p = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if p is None:
        p = UserPreference(user_id=user.id)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


@router.get("/account/preferences", response_model=PrefsOut)
def get_prefs(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> PrefsOut:
    p = _get_or_make_prefs(db, user)
    return PrefsOut(language=p.language, high_contrast=p.high_contrast,
                    dyslexia_font=p.dyslexia_font, larger_text=p.larger_text,
                    reduced_motion=p.reduced_motion)


@router.patch("/account/preferences", response_model=PrefsOut)
def update_prefs(body: PrefsIn, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> PrefsOut:
    p = _get_or_make_prefs(db, user)
    for field in ("language", "high_contrast", "dyslexia_font", "larger_text", "reduced_motion"):
        v = getattr(body, field)
        if v is not None:
            setattr(p, field, v)
    db.commit()
    db.refresh(p)
    return PrefsOut(language=p.language, high_contrast=p.high_contrast,
                    dyslexia_font=p.dyslexia_font, larger_text=p.larger_text,
                    reduced_motion=p.reduced_motion)


# ============ #8 Land hire ============


class LandHireOut(BaseModel):
    id: int
    name: str
    kind: str
    description: str | None
    capacity: int | None
    fee_cents_per_unit: int
    fee_unit: str
    location: str | None
    available: bool


@router.get("/land-hire", response_model=list[LandHireOut])
def list_land_hire(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> list[LandHireOut]:
    rows = (
        db.query(LandHireResource)
        .filter(LandHireResource.council_id == user.council_id)
        .order_by(LandHireResource.name)
        .all()
    )
    return [
        LandHireOut(
            id=r.id, name=r.name, kind=r.kind, description=r.description,
            capacity=r.capacity, fee_cents_per_unit=r.fee_cents_per_unit,
            fee_unit=r.fee_unit, location=r.location, available=r.available,
        )
        for r in rows
    ]


class LandHireBookIn(BaseModel):
    starts_at: datetime
    ends_at: datetime
    purpose: str | None = None


@router.post("/land-hire/{rid}/book", status_code=201)
def book_land_hire(rid: int, body: LandHireBookIn,
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> dict[str, Any]:
    r = db.get(LandHireResource, rid)
    if r is None or r.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if body.ends_at <= body.starts_at:
        raise HTTPException(status_code=400, detail="ends_at must be after starts_at")
    if not r.available:
        raise HTTPException(status_code=400, detail="Not available")
    duration = body.ends_at - body.starts_at
    if r.fee_unit == "hour":
        units = duration.total_seconds() / 3600
    elif r.fee_unit == "day":
        units = duration.total_seconds() / 86400
    else:
        units = duration.total_seconds() / (8 * 3600)  # night = 8h
    total = int(round(units * r.fee_cents_per_unit))
    b = LandHireBooking(
        resource_id=r.id, user_id=user.id,
        starts_at=body.starts_at, ends_at=body.ends_at,
        total_cents=total, purpose=body.purpose, status="confirmed",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id, "total_cents": total, "status": b.status}


# ============ #9 Citizen sensors ============


class SensorOut(BaseModel):
    id: int
    kind: str
    source: str
    value: float
    unit: str
    lat: float
    lng: float
    taken_at: datetime


@router.get("/sensors", response_model=list[SensorOut])
def list_sensors(
    kind: str | None = None,
    hours: int = Query(default=24, ge=1, le=720),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SensorOut]:
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    q = (
        db.query(SensorReading)
        .filter(
            SensorReading.council_id == user.council_id,
            SensorReading.taken_at >= cutoff,
        )
    )
    if kind:
        q = q.filter(SensorReading.kind == kind)
    rows = q.order_by(SensorReading.taken_at.desc()).limit(500).all()
    return [
        SensorOut(id=s.id, kind=s.kind, source=s.source, value=s.value_num,
                  unit=s.unit, lat=s.lat, lng=s.lng, taken_at=s.taken_at)
        for s in rows
    ]


# ============ #10 Predictive analytics ============


@router.get("/staff/predictions/sla-risk")
def predictions_sla(user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    return prediction.predict_sla_risk(db, council_id=user.council_id)


@router.get("/staff/predictions/dumping-hotspots")
def predictions_dumping(user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    return prediction.predict_dumping_hotspots(db, council_id=user.council_id)


# ============ Demo seed ============


def seed_v3_demo(db: Session, *, council_id: int) -> dict[str, int]:
    counts = {"grants": 0, "assets": 0, "closures": 0, "land": 0, "sensors": 0}
    now = datetime.now(UTC)
    today = date.today()

    if not db.query(GrantOpportunity).filter(
        or_(GrantOpportunity.council_id == council_id, GrantOpportunity.council_id.is_(None))
    ).first():
        grants = [
            (None, "federal", "Stronger Country Communities Fund",
             "Funding for community infrastructure in regional NSW. Up to $500k per project.",
             10000_00, 500000_00, today + timedelta(days=45),
             "https://www.nsw.gov.au/regional-nsw/stronger-country-communities-fund",
             "Regional NSW councils, community groups partnered with councils"),
            (None, "federal", "Volunteer Grants",
             "Small grants (up to $5k) for community volunteer organisations.",
             1000_00, 5000_00, today + timedelta(days=90),
             "https://www.dss.gov.au/grants/volunteer-grants",
             "Incorporated volunteer organisations"),
            (council_id, "council", "Leeton Community Small Grants",
             "Council-funded micro-grants ($500-$5k) for local arts, sport, and environment projects.",
             500_00, 5000_00, today + timedelta(days=20),
             None, "Leeton Shire residents, incorporated community groups"),
        ]
        for cid, source, title, desc, mn, mx, closes, url, elig in grants:
            db.add(GrantOpportunity(council_id=cid, source=source, title=title,
                                    description=desc, min_amount_cents=mn,
                                    max_amount_cents=mx, closes_at=closes,
                                    url=url, eligibility=elig,
                                    tags=["community", "grants"]))
            counts["grants"] += 1

    if not db.query(Asset).filter(Asset.council_id == council_id).first():
        assets = [
            ("playground", "Pine Park playground", -34.554, 146.402, "Pine Park, Pine Ave"),
            ("bbq", "Pine Park BBQ #1", -34.555, 146.403, "Pine Park, Pine Ave"),
            ("drinking_fountain", "Library forecourt fountain", -34.553, 146.404, "Library, Main St"),
            ("sign", "Welcome to Leeton entry sign", -34.560, 146.395, "Yanco Rd entry"),
            ("streetlight", "Streetlight #SL-2241", -34.557, 146.401, "Cnr Pine Ave & Wade St"),
        ]
        for kind, label, lat, lng, addr in assets:
            db.add(Asset(council_id=council_id, kind=kind, label=label,
                         qr_payload=secrets.token_urlsafe(10), lat=lat, lng=lng,
                         address_text=addr, status="active"))
            counts["assets"] += 1

    if not db.query(RoadClosure).filter(RoadClosure.council_id == council_id).first():
        closures = [
            ("Pine Ave resurfacing", "Lane closures both directions while resurfacing.",
             -34.557, 146.401, -34.558, 146.405,
             now + timedelta(days=2), now + timedelta(days=4),
             "works", "Use Wade St as detour."),
            ("ANZAC Day march", "Main St closed for ANZAC parade 9am-11am.",
             -34.556, 146.399, -34.556, 146.403,
             now + timedelta(days=14, hours=9), now + timedelta(days=14, hours=11),
             "closure", None),
        ]
        for title, desc, lat1, lng1, lat2, lng2, st, en, sev, detour in closures:
            db.add(RoadClosure(council_id=council_id, title=title, description=desc,
                               lat_from=lat1, lng_from=lng1, lat_to=lat2, lng_to=lng2,
                               starts_at=st, ends_at=en, severity=sev, detour=detour))
            counts["closures"] += 1

    if not db.query(LandHireResource).filter(LandHireResource.council_id == council_id).first():
        res = [
            ("Pine Park BBQ area", "bbq_area", "Covered BBQ area, fits ~30 people. Bring your own gas refill.", 30, 0, "day"),
            ("Senior Centre Hall", "hall", "Main hall, 120 chairs, kitchen, audio system.", 120, 8000, "day"),
            ("Yanco Oval #1", "oval", "Cricket/footy oval, lights available extra.", None, 5000, "hour"),
            ("Mill Creek campsite", "campsite", "10 unpowered sites, drop toilets, fire pits.", 10, 2500, "night"),
        ]
        for name, kind, desc, cap, fee, unit in res:
            db.add(LandHireResource(council_id=council_id, name=name, kind=kind,
                                    description=desc, capacity=cap,
                                    fee_cents_per_unit=fee, fee_unit=unit))
            counts["land"] += 1

    if not db.query(SensorReading).filter(SensorReading.council_id == council_id).first():
        # Simulate a small sensor network with last-day readings.
        sensors = [
            ("air_pm25", "purpleair", 8.4, "µg/m³", -34.554, 146.402),
            ("air_pm25", "sensorcommunity", 9.1, "µg/m³", -34.560, 146.395),
            ("noise_db", "self", 52.0, "dB", -34.556, 146.400),
            ("water_ph", "openaq", 7.2, "pH", -34.553, 146.404),
            ("temp_c", "purpleair", 24.5, "°C", -34.554, 146.402),
        ]
        for kind, src, val, unit, lat, lng in sensors:
            db.add(SensorReading(council_id=council_id, kind=kind, source=src,
                                 value_num=val, unit=unit, lat=lat, lng=lng,
                                 taken_at=now - timedelta(hours=2)))
            counts["sensors"] += 1

    db.commit()
    return counts
