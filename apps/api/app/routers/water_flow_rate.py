"""Resident-facing WS-FO-206 flow-rate test endpoints.

GET  /api/water/flow-rate-test/prefill — returns everything we already
     know about the signed-in resident so the form arrives 70% complete.
GET  /api/water/flow-rate-test         — list the user's own
     applications (most recent first).
POST /api/water/flow-rate-test         — lodge a new application.

Staff handling lives separately under /staff/water/flow-rate-test in a
future pass; for now applications land in `submitted` status and an
internal notification fires off to the water-ops team.
"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Property,
    PropertyOwnership,
    RatesAccount,
    Section68Application,
    User,
    WaterFlowRateApplication,
)

router = APIRouter(prefix="/water/flow-rate-test", tags=["water-flow-rate"])


# --------------------------------------------------------------------- #
# Prefill                                                               #
# --------------------------------------------------------------------- #


class PrefillProperty(BaseModel):
    id: int
    street_address: str
    assessment_no: str | None = None
    suburb: str | None = None
    postcode: str | None = None


class PrefillOut(BaseModel):
    applicant_name: str
    contact_email: str
    contact_phone: str | None
    postal_address: str | None
    properties: list[PrefillProperty]


def _postal_for(user: User, prop: Property | None) -> str | None:
    if prop is None:
        return None
    bits = [prop.address]
    if prop.suburb:
        bits.append(prop.suburb)
    if prop.postcode:
        bits.append(prop.postcode)
    return ", ".join(b for b in bits if b)


@router.get("/prefill", response_model=PrefillOut)
def prefill(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PrefillOut:
    ownerships = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.user_id == user.id)
        .all()
    )
    properties: list[PrefillProperty] = []
    for o in ownerships:
        p = db.get(Property, o.property_id)
        if p is None or p.council_id != user.council_id:
            continue
        account = (
            db.query(RatesAccount)
            .filter(RatesAccount.property_id == p.id)
            .first()
        )
        properties.append(
            PrefillProperty(
                id=p.id,
                street_address=p.address,
                assessment_no=(account.account_number if account else None),
                suburb=p.suburb,
                postcode=p.postcode,
            )
        )
    first = next((db.get(Property, o.property_id) for o in ownerships), None)
    return PrefillOut(
        applicant_name=user.name or "",
        contact_email=user.email,
        contact_phone=user.phone,
        postal_address=_postal_for(user, first),
        properties=properties,
    )


# --------------------------------------------------------------------- #
# Submit                                                                #
# --------------------------------------------------------------------- #


class FlowRateApplicationIn(BaseModel):
    # Section 68 link
    is_section_68: bool = False
    section_68_ref: str | None = Field(default=None, max_length=64)
    section_68_application_id: int | None = None
    cdc_da_ref: str | None = Field(default=None, max_length=64)

    # Applicant
    applicant_name: str = Field(min_length=1, max_length=160)
    applicant_postal_address: str = Field(min_length=1, max_length=300)
    company_name: str | None = Field(default=None, max_length=160)
    contact_phone: str = Field(min_length=6, max_length=32)
    contact_email: EmailStr

    # Hydrants / test type
    hydrant_asset_id_primary: str | None = Field(default=None, max_length=32)
    hydrant_asset_id_secondary: str | None = Field(default=None, max_length=32)
    test_type: str = Field(default="single", pattern="^(single|dual)$")

    # Property
    street_address: str = Field(min_length=1, max_length=300)
    lot: str | None = Field(default=None, max_length=32)
    dp: str | None = Field(default=None, max_length=32)
    assessment_no: str | None = Field(default=None, max_length=32)
    parcel: str | None = Field(default=None, max_length=64)
    property_description: str | None = Field(default=None, max_length=300)
    building_over_25m: bool = False

    # Purpose
    purpose_fire_service: bool = False
    purpose_town_supply: bool = False
    purpose_mains_extension: bool = False
    purpose_other: bool = False
    purpose_other_text: str | None = Field(default=None, max_length=300)
    new_street_hydrant: bool = False

    # Fire-service breakdown
    internal_hydrants: bool = False
    internal_hydrants_count: int | None = Field(default=None, ge=0, le=999)
    hose_reels: bool = False
    hose_reels_count: int | None = Field(default=None, ge=0, le=999)
    sprinklers: bool = False
    sprinklers_count: int | None = Field(default=None, ge=0, le=999)

    # Signature + plan
    signed_name: str = Field(min_length=1, max_length=160)
    site_plan_url: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class FlowRateApplicationOut(BaseModel):
    id: int
    reference: str
    status: str
    created_at: datetime
    requires_hydraulic_calc: bool
    street_address: str
    test_type: str


def _serialise(row: WaterFlowRateApplication) -> FlowRateApplicationOut:
    return FlowRateApplicationOut(
        id=row.id,
        reference=row.reference,
        status=row.status,
        created_at=row.created_at,
        requires_hydraulic_calc=row.purpose_fire_service,
        street_address=row.street_address,
        test_type=row.test_type,
    )


@router.post("", response_model=FlowRateApplicationOut,
             status_code=status.HTTP_201_CREATED)
def submit(
    body: FlowRateApplicationIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FlowRateApplicationOut:
    # At least one purpose must be ticked.
    if not any([body.purpose_fire_service, body.purpose_town_supply,
                body.purpose_mains_extension, body.purpose_other]):
        raise HTTPException(status_code=422,
                            detail="Choose at least one purpose for the test.")
    if body.purpose_other and not (body.purpose_other_text or "").strip():
        raise HTTPException(status_code=422,
                            detail="Describe the 'Other' purpose.")

    # If linking to a parent S68 application, verify it belongs to the caller.
    section_68_application_id: int | None = None
    if body.section_68_application_id is not None:
        parent = db.get(Section68Application, body.section_68_application_id)
        if (parent is None
                or parent.council_id != user.council_id
                or parent.user_id != user.id):
            raise HTTPException(status_code=422,
                                detail="Linked Section 68 application not found.")
        section_68_application_id = parent.id
        # If the caller didn't supply a section_68_ref, inherit it from the parent.
        if not body.section_68_ref:
            body.section_68_ref = parent.reference

    reference = f"FRT-{datetime.now(UTC).strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    row = WaterFlowRateApplication(
        council_id=user.council_id,
        user_id=user.id,
        reference=reference,
        status="submitted",
        section_68_application_id=section_68_application_id,
        is_section_68=body.is_section_68 or section_68_application_id is not None,
        section_68_ref=body.section_68_ref,
        cdc_da_ref=body.cdc_da_ref,
        applicant_name=body.applicant_name.strip(),
        applicant_postal_address=body.applicant_postal_address.strip(),
        company_name=(body.company_name or None),
        contact_phone=body.contact_phone.strip(),
        contact_email=str(body.contact_email),
        hydrant_asset_id_primary=body.hydrant_asset_id_primary,
        hydrant_asset_id_secondary=body.hydrant_asset_id_secondary,
        test_type=body.test_type,
        street_address=body.street_address.strip(),
        lot=body.lot,
        dp=body.dp,
        assessment_no=body.assessment_no,
        parcel=body.parcel,
        property_description=body.property_description,
        building_over_25m=body.building_over_25m,
        purpose_fire_service=body.purpose_fire_service,
        purpose_town_supply=body.purpose_town_supply,
        purpose_mains_extension=body.purpose_mains_extension,
        purpose_other=body.purpose_other,
        purpose_other_text=body.purpose_other_text,
        new_street_hydrant=body.new_street_hydrant,
        internal_hydrants=body.internal_hydrants,
        internal_hydrants_count=body.internal_hydrants_count,
        hose_reels=body.hose_reels,
        hose_reels_count=body.hose_reels_count,
        sprinklers=body.sprinklers,
        sprinklers_count=body.sprinklers_count,
        signed_name=body.signed_name.strip(),
        signed_at=datetime.now(UTC),
        site_plan_url=body.site_plan_url,
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialise(row)


@router.get("", response_model=list[FlowRateApplicationOut])
def list_mine(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FlowRateApplicationOut]:
    rows: list[WaterFlowRateApplication] = (
        db.query(WaterFlowRateApplication)
        .filter(
            WaterFlowRateApplication.council_id == user.council_id,
            WaterFlowRateApplication.user_id == user.id,
        )
        .order_by(WaterFlowRateApplication.created_at.desc())
        .limit(50)
        .all()
    )
    return [_serialise(r) for r in rows]
