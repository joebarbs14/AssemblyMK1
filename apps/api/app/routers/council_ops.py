"""Council ops endpoints: hardship, bin lookup, pets, permits, cemetery,
budget transparency, businesses, donations, iCal, grant writer,
volunteer-hours ledger.

FOSS-first throughout.
"""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    BudgetLine,
    Business,
    CapitalProject,
    CemeteryRecord,
    ConcessionApplication,
    CouncilMeeting,
    Donation,
    DonationCampaign,
    GrantDraft,
    Permit,
    PetRegistration,
    Program,
    ProgramBooking,
    Property,
    PropertyOwnership,
    User,
    UserRole,
    WasteCollection,
)
from app.services import grant_writer, ical

router = APIRouter(tags=["council-ops"])
public_router = APIRouter(prefix="/public", tags=["public-search"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============================================================
# Hardship / concession self-service
# ============================================================


class ConcessionIn(BaseModel):
    kind: str = Field(pattern="^(pensioner|hardship|disability|veteran|other)$")
    property_id: int | None = None
    pensioner_concession_card: str | None = None
    annual_income_aud: int | None = Field(default=None, ge=0)
    reason: str = Field(min_length=10, max_length=4000)
    requested_relief: str | None = None


class ConcessionOut(BaseModel):
    id: int
    kind: str
    status: str
    requested_relief: str | None
    created_at: datetime


@router.post("/concessions", response_model=ConcessionOut, status_code=201)
def apply_concession(
    body: ConcessionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConcessionOut:
    if body.property_id is not None:
        prop = db.get(Property, body.property_id)
        if prop is None or prop.council_id != user.council_id:
            raise HTTPException(status_code=400, detail="Unknown property")
        own = (
            db.query(PropertyOwnership)
            .filter(PropertyOwnership.property_id == prop.id, PropertyOwnership.user_id == user.id)
            .first()
        )
        if own is None:
            raise HTTPException(status_code=403, detail="Not your property")

    # Auto-approve pensioner with a card number provided (low-risk).
    status = "approved" if (body.kind == "pensioner" and body.pensioner_concession_card) else "pending"
    app_row = ConcessionApplication(
        council_id=user.council_id,
        applicant_user_id=user.id,
        property_id=body.property_id,
        kind=body.kind,
        pensioner_concession_card=body.pensioner_concession_card,
        annual_income_aud=body.annual_income_aud,
        reason=body.reason,
        requested_relief=body.requested_relief,
        status=status,
        decided_at=datetime.now(UTC) if status == "approved" else None,
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    return ConcessionOut(
        id=app_row.id, kind=app_row.kind, status=app_row.status,
        requested_relief=app_row.requested_relief, created_at=app_row.created_at,
    )


@router.get("/concessions/mine", response_model=list[ConcessionOut])
def list_my_concessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConcessionOut]:
    rows = (
        db.query(ConcessionApplication)
        .filter(ConcessionApplication.applicant_user_id == user.id)
        .order_by(ConcessionApplication.created_at.desc())
        .all()
    )
    return [
        ConcessionOut(
            id=r.id, kind=r.kind, status=r.status,
            requested_relief=r.requested_relief, created_at=r.created_at,
        )
        for r in rows
    ]


# ============================================================
# Bin lookup by address (FOSS: keyword-matched, OSM-friendly)
# ============================================================


class BinLookupOut(BaseModel):
    matched_address: str | None
    route_name: str | None
    collection_day: str | None
    frequency: str | None
    next_collection: date | None
    bin_colours_tomorrow: list[str]


@router.get("/bin-lookup", response_model=BinLookupOut)
def bin_lookup(
    address: str = Query(min_length=2),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BinLookupOut:
    """Look up a resident's bin schedule. Matches against their owned
    properties first (most accurate); falls back to fuzzy match on
    address text across all properties in the council.

    Real-world implementation: geocode the address via Nominatim,
    then point-in-polygon against waste_collection.route_geojson.
    """
    needle = address.lower().strip()

    # Owned properties first.
    own = (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(PropertyOwnership.user_id == user.id, Property.council_id == user.council_id)
        .all()
    )
    match = next((p for p in own if needle in p.address.lower()), None)

    # Council-wide search.
    if match is None:
        match = (
            db.query(Property)
            .filter(Property.council_id == user.council_id,
                    func.lower(Property.address).like(f"%{needle}%"))
            .first()
        )

    if match is None or match.waste_route_id is None:
        return BinLookupOut(
            matched_address=match.address if match else None,
            route_name=None, collection_day=None, frequency=None,
            next_collection=None, bin_colours_tomorrow=[],
        )

    route = db.get(WasteCollection, match.waste_route_id)
    if route is None:
        return BinLookupOut(
            matched_address=match.address,
            route_name=None, collection_day=None, frequency=None,
            next_collection=None, bin_colours_tomorrow=[],
        )

    # Decide colours: simple convention.
    colour_map = {"general": "red", "recycling": "yellow", "green": "green", "hard": "blue"}
    colours: list[str] = []
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).strftime("%a")
    if route.collection_day.startswith(tomorrow):
        colours.append(colour_map.get(route.collection_type, "red"))

    return BinLookupOut(
        matched_address=match.address,
        route_name=route.name,
        collection_day=route.collection_day,
        frequency=route.frequency,
        next_collection=route.next_collection,
        bin_colours_tomorrow=colours,
    )


# ============================================================
# Pet registration
# ============================================================


class PetRegistrationIn(BaseModel):
    species: str = Field(pattern="^(dog|cat|other)$")
    name: str = Field(min_length=1, max_length=80)
    breed: str | None = None
    colour: str | None = None
    sex: str | None = Field(default=None, pattern="^(M|F|N)$")
    desexed: bool = False
    date_of_birth: date | None = None
    microchip_id: str | None = None


class PetRegistrationOut(BaseModel):
    id: int
    species: str
    name: str
    breed: str | None
    registration_number: str
    valid_until: date
    annual_fee_cents: int
    status: str


def _next_pet_registration_number(db: Session, council_id: int) -> str:
    year = date.today().year
    count = db.query(PetRegistration).filter(
        PetRegistration.council_id == council_id
    ).count()
    return f"PR-{year}-{(count + 1):05d}"


def _pet_fee_cents(species: str, desexed: bool) -> int:
    if species == "dog":
        return 5000 if desexed else 12000
    if species == "cat":
        return 3000 if desexed else 8000
    return 2000


@router.post("/pets", response_model=PetRegistrationOut, status_code=201)
def register_pet(
    body: PetRegistrationIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PetRegistrationOut:
    pet = PetRegistration(
        council_id=user.council_id,
        owner_user_id=user.id,
        species=body.species,
        name=body.name.strip(),
        breed=body.breed,
        colour=body.colour,
        sex=body.sex,
        desexed=body.desexed,
        date_of_birth=body.date_of_birth,
        microchip_id=body.microchip_id,
        registration_number=_next_pet_registration_number(db, user.council_id),
        valid_until=date.today() + timedelta(days=365),
        annual_fee_cents=_pet_fee_cents(body.species, body.desexed),
        status="active",
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return PetRegistrationOut(
        id=pet.id, species=pet.species, name=pet.name, breed=pet.breed,
        registration_number=pet.registration_number, valid_until=pet.valid_until,
        annual_fee_cents=pet.annual_fee_cents, status=pet.status,
    )


@router.get("/pets/mine", response_model=list[PetRegistrationOut])
def list_my_pets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PetRegistrationOut]:
    rows = (
        db.query(PetRegistration)
        .filter(PetRegistration.owner_user_id == user.id)
        .order_by(PetRegistration.created_at.desc())
        .all()
    )
    return [
        PetRegistrationOut(
            id=p.id, species=p.species, name=p.name, breed=p.breed,
            registration_number=p.registration_number, valid_until=p.valid_until,
            annual_fee_cents=p.annual_fee_cents, status=p.status,
        )
        for p in rows
    ]


# ============================================================
# Permits
# ============================================================


class PermitIn(BaseModel):
    kind: str = Field(pattern="^(resident_parking|visitor_parking|beach|trade_day|skip_bin)$")
    plate: str | None = Field(default=None, max_length=16)
    valid_from: date
    valid_until: date
    zone: str | None = None
    property_id: int | None = None


class PermitOut(BaseModel):
    id: int
    kind: str
    permit_number: str
    plate: str | None
    holder_name: str
    valid_from: date
    valid_until: date
    qr_payload: str
    status: str


def _permit_fee_cents(kind: str) -> int:
    return {
        "resident_parking": 0,
        "visitor_parking": 0,
        "beach": 4500,
        "trade_day": 2500,
        "skip_bin": 7500,
    }.get(kind, 0)


@router.post("/permits", response_model=PermitOut, status_code=201)
def issue_permit(
    body: PermitIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PermitOut:
    if body.valid_until <= body.valid_from:
        raise HTTPException(status_code=400, detail="valid_until must be after valid_from")
    permit = Permit(
        council_id=user.council_id,
        user_id=user.id,
        property_id=body.property_id,
        kind=body.kind,
        permit_number=f"P-{date.today().year}-{secrets.token_hex(3).upper()}",
        plate=(body.plate or "").upper() or None,
        holder_name=user.name or user.email,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        zone=body.zone,
        fee_cents=_permit_fee_cents(body.kind),
        qr_payload=secrets.token_urlsafe(16),
        status="active",
    )
    db.add(permit)
    db.commit()
    db.refresh(permit)
    return PermitOut(
        id=permit.id, kind=permit.kind, permit_number=permit.permit_number,
        plate=permit.plate, holder_name=permit.holder_name,
        valid_from=permit.valid_from, valid_until=permit.valid_until,
        qr_payload=permit.qr_payload, status=permit.status,
    )


@router.get("/permits/mine", response_model=list[PermitOut])
def list_my_permits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PermitOut]:
    rows = (
        db.query(Permit)
        .filter(Permit.user_id == user.id)
        .order_by(Permit.created_at.desc())
        .all()
    )
    return [
        PermitOut(
            id=p.id, kind=p.kind, permit_number=p.permit_number,
            plate=p.plate, holder_name=p.holder_name,
            valid_from=p.valid_from, valid_until=p.valid_until,
            qr_payload=p.qr_payload, status=p.status,
        )
        for p in rows
    ]


@public_router.get("/permits/verify/{qr_payload}")
def verify_permit(qr_payload: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Ranger scans the QR — anyone can verify without auth."""
    p = db.query(Permit).filter(Permit.qr_payload == qr_payload).first()
    if p is None:
        return {"valid": False, "reason": "unknown"}
    today = date.today()
    if p.status != "active":
        return {"valid": False, "reason": p.status}
    if today < p.valid_from or today > p.valid_until:
        return {"valid": False, "reason": "expired_or_not_yet"}
    return {
        "valid": True,
        "permit_number": p.permit_number,
        "kind": p.kind,
        "plate": p.plate,
        "holder_name": p.holder_name,
        "valid_until": p.valid_until.isoformat(),
        "zone": p.zone,
    }


# ============================================================
# Cemetery records search (public)
# ============================================================


class CemeteryRow(BaseModel):
    id: int
    cemetery_name: str
    deceased_full_name: str
    date_of_death: date | None
    date_of_birth: date | None
    section: str | None
    row: str | None
    plot: str | None


@public_router.get("/cemetery/{council_slug}/search", response_model=list[CemeteryRow])
def search_cemetery(
    council_slug: str,
    q: str = Query(min_length=2, max_length=200),
    db: Session = Depends(get_db),
) -> list[CemeteryRow]:
    from app.models import Council  # local import

    council = db.query(Council).filter(Council.slug == council_slug).first()
    if council is None:
        raise HTTPException(status_code=404, detail="Council not found")
    needle = f"%{q.lower()}%"
    rows = (
        db.query(CemeteryRecord)
        .filter(
            CemeteryRecord.council_id == council.id,
            or_(
                func.lower(CemeteryRecord.deceased_full_name).like(needle),
                func.lower(CemeteryRecord.cemetery_name).like(needle),
            ),
        )
        .order_by(CemeteryRecord.deceased_full_name)
        .limit(50)
        .all()
    )
    return [
        CemeteryRow(
            id=r.id, cemetery_name=r.cemetery_name,
            deceased_full_name=r.deceased_full_name,
            date_of_death=r.date_of_death, date_of_birth=r.date_of_birth,
            section=r.section, row=r.row, plot=r.plot,
        )
        for r in rows
    ]


# ============================================================
# Council budget transparency
# ============================================================


class BudgetSlice(BaseModel):
    category: str
    label: str
    expense_cents: int
    prior_year_expense_cents: int | None


class BudgetOut(BaseModel):
    fiscal_year: int
    total_expense_cents: int
    total_revenue_cents: int
    by_category: list[BudgetSlice]


@router.get("/budget", response_model=BudgetOut)
def budget_overview(
    fiscal_year: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetOut:
    year = fiscal_year or date.today().year
    rows = (
        db.query(BudgetLine)
        .filter(
            BudgetLine.council_id == user.council_id,
            BudgetLine.fiscal_year == year,
        )
        .order_by(BudgetLine.category, BudgetLine.label)
        .all()
    )
    return BudgetOut(
        fiscal_year=year,
        total_expense_cents=sum(r.expense_cents for r in rows),
        total_revenue_cents=sum(r.revenue_cents for r in rows),
        by_category=[
            BudgetSlice(
                category=r.category, label=r.label,
                expense_cents=r.expense_cents,
                prior_year_expense_cents=r.prior_year_expense_cents,
            )
            for r in rows
        ],
    )


class CapitalProjectOut(BaseModel):
    id: int
    title: str
    category: str | None
    budget_cents: int
    spent_cents: int
    status: str
    progress_pct: int
    expected_completion: date | None


@router.get("/budget/capital-projects", response_model=list[CapitalProjectOut])
def list_capital_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CapitalProjectOut]:
    year = date.today().year
    rows = (
        db.query(CapitalProject)
        .filter(
            CapitalProject.council_id == user.council_id,
            CapitalProject.fiscal_year == year,
        )
        .order_by(CapitalProject.title)
        .all()
    )
    return [
        CapitalProjectOut(
            id=p.id, title=p.title, category=p.category,
            budget_cents=p.budget_cents, spent_cents=p.spent_cents,
            status=p.status, progress_pct=p.progress_pct,
            expected_completion=p.expected_completion,
        )
        for p in rows
    ]


# ============================================================
# Local business directory
# ============================================================


class BusinessOut(BaseModel):
    id: int
    name: str
    category: str
    description: str | None
    phone: str | None
    website: str | None
    address: str | None
    verified: bool


class BusinessIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    category: str = Field(min_length=2, max_length=64)
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    address: str | None = None
    abn: str | None = None


@router.get("/businesses", response_model=list[BusinessOut])
def list_businesses(
    q: str | None = None,
    category: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BusinessOut]:
    query = db.query(Business).filter(Business.council_id == user.council_id)
    if category:
        query = query.filter(Business.category == category)
    if q:
        needle = f"%{q.lower()}%"
        query = query.filter(
            or_(
                func.lower(Business.name).like(needle),
                func.lower(Business.description).like(needle),
            )
        )
    rows = query.order_by(Business.verified.desc(), Business.name).limit(100).all()
    return [
        BusinessOut(
            id=b.id, name=b.name, category=b.category, description=b.description,
            phone=b.phone, website=b.website, address=b.address,
            verified=b.verified,
        )
        for b in rows
    ]


@router.post("/businesses", response_model=BusinessOut, status_code=201)
def list_my_business(
    body: BusinessIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BusinessOut:
    """Self-submit a business listing. Verification by council staff
    follows; verified=False initially."""
    b = Business(
        council_id=user.council_id,
        name=body.name.strip(), category=body.category,
        description=body.description, phone=body.phone, email=body.email,
        website=body.website, address=body.address, abn=body.abn,
        verified=False,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return BusinessOut(
        id=b.id, name=b.name, category=b.category, description=b.description,
        phone=b.phone, website=b.website, address=b.address, verified=b.verified,
    )


# ============================================================
# Community donation campaigns
# ============================================================


class CampaignOut(BaseModel):
    id: int
    title: str
    blurb: str
    target_cents: int
    raised_cents: int
    progress_pct: int
    status: str
    closes_at: datetime | None


@router.get("/donations/campaigns", response_model=list[CampaignOut])
def list_campaigns(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CampaignOut]:
    rows = (
        db.query(DonationCampaign)
        .filter(DonationCampaign.council_id == user.council_id)
        .order_by(DonationCampaign.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        CampaignOut(
            id=c.id, title=c.title, blurb=c.blurb,
            target_cents=c.target_cents, raised_cents=c.raised_cents,
            progress_pct=min(100, int(c.raised_cents / max(1, c.target_cents) * 100)),
            status=c.status, closes_at=c.closes_at,
        )
        for c in rows
    ]


class DonateIn(BaseModel):
    amount_cents: int = Field(ge=100)
    anonymous: bool = False
    message: str | None = Field(default=None, max_length=500)


@router.post("/donations/campaigns/{campaign_id}/donate", status_code=201)
def donate(
    campaign_id: int,
    body: DonateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Records a donation. Real PayPal flow piggybacks on existing
    /api/rates/invoices/.../paypal-order pattern in M9.x."""
    c = db.get(DonationCampaign, campaign_id)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.status != "active":
        raise HTTPException(status_code=400, detail="Campaign not active")

    d = Donation(
        campaign_id=c.id, donor_user_id=None if body.anonymous else user.id,
        amount_cents=body.amount_cents, provider="paypal",
        anonymous=body.anonymous, message=body.message,
    )
    db.add(d)
    c.raised_cents += body.amount_cents
    if c.raised_cents >= c.target_cents:
        c.status = "funded"
    db.commit()
    db.refresh(d)
    return {"id": d.id, "raised_cents": c.raised_cents, "status": c.status}


# ============================================================
# Calendar exports (iCal)
# ============================================================


@router.get("/calendar/me.ics")
def my_calendar(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Personal calendar feed: bin nights + booked programs +
    upcoming council meetings."""
    events: list[dict[str, Any]] = []

    # Bin night per owned property.
    props = (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(PropertyOwnership.user_id == user.id, Property.council_id == user.council_id)
        .all()
    )
    for p in props:
        if p.waste_route_id is None:
            continue
        route = db.get(WasteCollection, p.waste_route_id)
        if route is None or route.next_collection is None:
            continue
        events.append({
            "uid": f"binnight-{p.id}-{route.id}@assembly",
            "summary": f"Bin night ({route.collection_type})",
            "description": f"{route.collection_type} bin pickup — route {route.name}",
            "location": p.address,
            "dtstart": route.next_collection,
            "all_day": True,
        })

    # Booked programs.
    bookings = (
        db.query(ProgramBooking, Program)
        .join(Program, Program.id == ProgramBooking.program_id)
        .filter(ProgramBooking.user_id == user.id, ProgramBooking.status != "cancelled")
        .all()
    )
    for b, p in bookings:
        if p.starts_at is None:
            continue
        events.append({
            "uid": f"program-{b.id}@assembly",
            "summary": p.title,
            "description": p.description,
            "location": p.location,
            "dtstart": p.starts_at,
            "dtend": p.ends_at,
        })

    # Upcoming council meetings.
    upcoming = (
        db.query(CouncilMeeting)
        .filter(
            CouncilMeeting.council_id == user.council_id,
            CouncilMeeting.starts_at >= datetime.now(UTC),
        )
        .order_by(CouncilMeeting.starts_at)
        .limit(10)
        .all()
    )
    for m in upcoming:
        events.append({
            "uid": f"meeting-{m.id}@assembly",
            "summary": m.title,
            "description": m.notes,
            "location": m.location,
            "dtstart": m.starts_at,
            "dtend": m.starts_at + timedelta(minutes=m.duration_minutes),
        })

    body = ical.render(title="Assembly — my calendar", events=events)
    return Response(content=body, media_type="text/calendar; charset=utf-8")


# ============================================================
# AI grant-writing helper
# ============================================================


class GrantDraftIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    grant_name: str | None = None
    project_summary: str = Field(min_length=20, max_length=4000)
    requested_amount_cents: int | None = None


class GrantDraftOut(BaseModel):
    id: int
    title: str
    grant_name: str | None
    draft_markdown: str
    provider: str
    updated_at: datetime


@router.post("/grants/draft", response_model=GrantDraftOut, status_code=201)
def make_grant_draft(
    body: GrantDraftIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrantDraftOut:
    out = grant_writer.draft(
        title=body.title, summary=body.project_summary,
        requested_amount_cents=body.requested_amount_cents,
        grant_name=body.grant_name,
    )
    g = GrantDraft(
        council_id=user.council_id,
        user_id=user.id,
        title=body.title,
        grant_name=body.grant_name,
        project_summary=body.project_summary,
        requested_amount_cents=body.requested_amount_cents,
        draft_markdown=out["draft_markdown"],
        provider=out["provider"],
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return GrantDraftOut(
        id=g.id, title=g.title, grant_name=g.grant_name,
        draft_markdown=g.draft_markdown, provider=g.provider, updated_at=g.updated_at,
    )


@router.get("/grants/mine", response_model=list[GrantDraftOut])
def list_my_grants(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GrantDraftOut]:
    rows = (
        db.query(GrantDraft)
        .filter(GrantDraft.user_id == user.id)
        .order_by(GrantDraft.updated_at.desc())
        .all()
    )
    return [
        GrantDraftOut(
            id=g.id, title=g.title, grant_name=g.grant_name,
            draft_markdown=g.draft_markdown, provider=g.provider, updated_at=g.updated_at,
        )
        for g in rows
    ]


# ============================================================
# Volunteer-hours ledger (derived from program_booking)
# ============================================================


class VolunteerHoursOut(BaseModel):
    total_hours: float
    by_program: list[dict[str, Any]]


@router.get("/account/volunteer-hours", response_model=VolunteerHoursOut)
def my_volunteer_hours(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VolunteerHoursOut:
    rows = (
        db.query(ProgramBooking, Program)
        .join(Program, Program.id == ProgramBooking.program_id)
        .filter(
            ProgramBooking.user_id == user.id,
            ProgramBooking.status == "confirmed",
            Program.kind == "volunteer",
        )
        .all()
    )
    by_program: list[dict[str, Any]] = []
    total = 0.0
    for _b, p in rows:
        if p.starts_at is None or p.ends_at is None:
            hours = 0.0
        else:
            hours = (p.ends_at - p.starts_at).total_seconds() / 3600
        total += hours
        by_program.append({
            "program": p.title,
            "date": p.starts_at.isoformat() if p.starts_at else None,
            "hours": round(hours, 2),
        })
    return VolunteerHoursOut(total_hours=round(total, 2), by_program=by_program)


# ============================================================
# Demo seed extension
# ============================================================


def seed_council_ops_demo(db: Session, *, council_id: int) -> dict[str, int]:
    counts = {"businesses": 0, "campaigns": 0, "budget": 0, "projects": 0, "cemetery": 0}

    if not db.query(Business).filter(Business.council_id == council_id).first():
        bs = [
            ("Pine St Plumbing", "plumber", "Fully-licensed local plumber. Emergency hot water specialist."),
            ("Spark Electrical", "electrician", "Family-owned electrician serving the shire since 1987."),
            ("Mill Cafe", "cafe", "Specialty coffee + lunch. Free WiFi. Dog-friendly outside."),
            ("Town Mechanics", "automotive", "Log book servicing, tyres, rego inspections."),
            ("Riverside Florist", "retail", "Weddings, funerals, weekly deliveries."),
        ]
        for name, cat, desc in bs:
            db.add(Business(council_id=council_id, name=name, category=cat,
                            description=desc, verified=True))
            counts["businesses"] += 1

    if not db.query(DonationCampaign).filter(DonationCampaign.council_id == council_id).first():
        db.add(DonationCampaign(
            council_id=council_id, title="Playground upgrade — Pine Park",
            blurb="Replace the ageing playground with all-abilities equipment. "
                  "Council match: $2 for every $1 raised by the community.",
            target_cents=2500000, raised_cents=1840000, status="active",
            closes_at=datetime.now(UTC) + timedelta(days=45),
        ))
        db.add(DonationCampaign(
            council_id=council_id, title="Community garden expansion",
            blurb="Double the garden beds at the Mill St community garden + add a tool shed.",
            target_cents=600000, raised_cents=620000, status="funded",
        ))
        counts["campaigns"] = 2

    year = date.today().year
    if not db.query(BudgetLine).filter(BudgetLine.council_id == council_id, BudgetLine.fiscal_year == year).first():
        lines = [
            ("roads", "Road maintenance", 12_400_000, 11_800_000),
            ("waste", "Waste collection + landfill", 4_200_000, 4_050_000),
            ("parks", "Parks + open space", 3_100_000, 2_900_000),
            ("libraries", "Libraries + culture", 1_800_000, 1_750_000),
            ("governance", "Governance + corporate", 5_500_000, 5_300_000),
            ("community", "Community services + grants", 2_400_000, 2_200_000),
            ("planning", "Planning + building", 2_100_000, 2_050_000),
            ("environment", "Environment + sustainability", 1_200_000, 950_000),
        ]
        # Match revenue: rates make up ~65% of typical AU council revenue.
        for cat, label, exp, prior in lines:
            rev = int(exp * 0.65)
            db.add(BudgetLine(
                council_id=council_id, fiscal_year=year, category=cat, label=label,
                expense_cents=exp * 100, revenue_cents=rev * 100,
                prior_year_expense_cents=prior * 100,
            ))
            counts["budget"] += 1
        projects = [
            ("Main St footpath renewal", "roads", 1_200_000, 720_000, "in_progress", 60),
            ("Pine Park playground", "parks", 850_000, 0, "planned", 5),
            ("Library refurbishment", "libraries", 2_400_000, 2_200_000, "in_progress", 92),
            ("Solar on council HQ", "environment", 420_000, 420_000, "completed", 100),
        ]
        for title, cat, budget, spent, st, pct in projects:
            db.add(CapitalProject(
                council_id=council_id, fiscal_year=year, title=title, category=cat,
                budget_cents=budget * 100, spent_cents=spent * 100,
                status=st, progress_pct=pct,
                expected_completion=date(year, 12, 31) if st != "completed" else date(year, 6, 30),
            ))
            counts["projects"] += 1

    if not db.query(CemeteryRecord).filter(CemeteryRecord.council_id == council_id).first():
        records = [
            ("Leeton General Cemetery", "A", "12", "8", "John Henry Smith", date(1925, 3, 14), date(1998, 11, 2)),
            ("Leeton General Cemetery", "A", "12", "9", "Margaret Anne Smith", date(1928, 7, 22), date(2003, 1, 18)),
            ("Leeton General Cemetery", "B", "3", "14", "James Patrick O'Brien", date(1940, 5, 1), date(2019, 9, 30)),
            ("Yanco Cemetery", "C", "1", "2", "Eliza May Thompson", date(1888, 2, 11), date(1962, 6, 5)),
        ]
        for cem, sec, row, plot, name, dob, dod in records:
            db.add(CemeteryRecord(
                council_id=council_id, cemetery_name=cem, section=sec, row=row, plot=plot,
                deceased_full_name=name, date_of_birth=dob, date_of_death=dod,
                date_of_burial=dod + timedelta(days=5) if dod else None,
            ))
            counts["cemetery"] += 1

    db.commit()
    return counts
