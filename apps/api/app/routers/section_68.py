"""Resident-facing Section 68 application endpoints.

GET  /api/section-68/activity-classes  — canonical Parts A–F catalogue
GET  /api/section-68/prefill           — applicant + first-property prefill
GET  /api/section-68                   — list the user's S68 applications
POST /api/section-68                   — start a new S68 application
GET  /api/section-68/{id}              — fetch one, including attached
                                         sub-forms (e.g. flow-rate test)

Parent ↔ sub-form linkage: sub-form tables carry a nullable
`section_68_application_id`. Submitting a sub-form with that field set
roll-ups under the parent record's "attached sub-forms" view.
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

router = APIRouter(prefix="/section-68", tags=["section-68"])


# --------------------------------------------------------------------- #
# Catalogue                                                             #
# --------------------------------------------------------------------- #


class ActivitySubtype(BaseModel):
    key: str
    label: str
    department: str
    sub_form_key: str | None = None  # if a dedicated sub-form exists


class ActivityClass(BaseModel):
    code: str
    label: str
    summary: str
    subtypes: list[ActivitySubtype]


CATALOGUE: list[ActivityClass] = [
    ActivityClass(
        code="A",
        label="Structures or places of public entertainment",
        summary="Install a manufactured home, hoarding, scaffolding or "
                "structure in or over a public place.",
        subtypes=[
            ActivitySubtype(key="manufactured_home", label="Install a manufactured home",
                            department="building"),
            ActivitySubtype(key="hoarding", label="Install a hoarding or scaffold",
                            department="building"),
            ActivitySubtype(key="public_place_structure",
                            label="Erect a structure in a public place",
                            department="building"),
        ],
    ),
    ActivityClass(
        code="B",
        label="Water supply, sewerage and stormwater drainage work",
        summary="Connect, alter or extend water, sewer or stormwater. The "
                "flow-rate test (WS-FO-206) sits under this part.",
        subtypes=[
            ActivitySubtype(key="water_supply_work",
                            label="Carry out water supply work",
                            department="water",
                            sub_form_key="flow_rate_test"),
            ActivitySubtype(key="standpipe_draw",
                            label="Draw water from a council standpipe",
                            department="water"),
            ActivitySubtype(key="water_meter",
                            label="Install / alter / disconnect a water meter",
                            department="water"),
            ActivitySubtype(key="sewerage_work",
                            label="Carry out sewerage work",
                            department="water"),
            ActivitySubtype(key="stormwater_work",
                            label="Carry out stormwater drainage work",
                            department="water"),
            ActivitySubtype(key="drain_connection",
                            label="Connect a private drain to council's system",
                            department="water"),
        ],
    ),
    ActivityClass(
        code="C",
        label="Management of waste",
        summary="On-site sewage management systems, sewer discharge, "
                "domestic waste arrangements.",
        subtypes=[
            ActivitySubtype(key="ossm_install",
                            label="Install or alter an on-site sewage management system",
                            department="water"),
            ActivitySubtype(key="ossm_operate",
                            label="Operate an existing on-site sewage management system",
                            department="water"),
            ActivitySubtype(key="sewer_discharge",
                            label="Discharge trade waste to the sewer",
                            department="water"),
        ],
    ),
    ActivityClass(
        code="D",
        label="Community land",
        summary="Trading, performances or temporary structures on land "
                "classified as community land.",
        subtypes=[
            ActivitySubtype(key="trade_business",
                            label="Engage in a trade or business",
                            department="planning"),
            ActivitySubtype(key="performance",
                            label="Direct or procure a theatrical performance",
                            department="planning"),
            ActivitySubtype(key="temp_enclosure",
                            label="Construct a temporary enclosure",
                            department="planning"),
        ],
    ),
    ActivityClass(
        code="E",
        label="Public roads",
        summary="Awnings, footpath dining, hoisting goods, kerb crossings.",
        subtypes=[
            ActivitySubtype(key="awning", label="Awning over a public road",
                            department="planning"),
            ActivitySubtype(key="footpath_dining",
                            label="Footpath dining",
                            department="planning"),
            ActivitySubtype(key="hoist_goods",
                            label="Swing or hoist goods across a road",
                            department="planning"),
            ActivitySubtype(key="kerb_crossing",
                            label="Kerb and gutter crossing",
                            department="roads"),
        ],
    ),
    ActivityClass(
        code="F",
        label="Other activities",
        summary="Caravan parks, amusement devices, and any other s68 activity.",
        subtypes=[
            ActivitySubtype(key="caravan_park",
                            label="Operate a caravan park or camping ground",
                            department="planning"),
            ActivitySubtype(key="amusement_device",
                            label="Install or operate an amusement device",
                            department="planning"),
        ],
    ),
]


@router.get("/activity-classes", response_model=list[ActivityClass])
def activity_classes() -> list[ActivityClass]:
    return CATALOGUE


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


def _postal_for(prop: Property | None) -> str | None:
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
        postal_address=_postal_for(first),
        properties=properties,
    )


# --------------------------------------------------------------------- #
# Create / list / fetch                                                 #
# --------------------------------------------------------------------- #


class Section68In(BaseModel):
    activity_class: str = Field(min_length=1, max_length=1, pattern="^[A-F]$")
    activity_subtype: str = Field(min_length=1, max_length=64)
    is_new_build: bool = False
    linked_cdc_da_ref: str | None = Field(default=None, max_length=64)

    street_address: str = Field(min_length=1, max_length=300)
    lot: str | None = Field(default=None, max_length=32)
    dp: str | None = Field(default=None, max_length=32)
    assessment_no: str | None = Field(default=None, max_length=32)
    parcel: str | None = Field(default=None, max_length=64)

    applicant_name: str = Field(min_length=1, max_length=160)
    applicant_postal_address: str = Field(min_length=1, max_length=300)
    contact_phone: str = Field(min_length=6, max_length=32)
    contact_email: EmailStr

    description: str = Field(min_length=1)
    notes: str | None = None


class SubFormSummary(BaseModel):
    kind: str
    id: int
    reference: str
    status: str
    title: str


class Section68Out(BaseModel):
    id: int
    reference: str
    status: str
    created_at: datetime
    activity_class: str
    activity_subtype: str
    is_new_build: bool
    linked_cdc_da_ref: str | None
    street_address: str
    description: str
    sub_forms: list[SubFormSummary]


def _subtype_label(activity_class: str, subtype_key: str) -> str:
    for cls in CATALOGUE:
        if cls.code != activity_class:
            continue
        for st in cls.subtypes:
            if st.key == subtype_key:
                return st.label
    return subtype_key


def _serialise(row: Section68Application, db: Session) -> Section68Out:
    # Roll-up sub-forms attached to this parent.
    flow_rate_rows: list[WaterFlowRateApplication] = (
        db.query(WaterFlowRateApplication)
        .filter(WaterFlowRateApplication.section_68_application_id == row.id)
        .order_by(WaterFlowRateApplication.created_at.desc())
        .all()
    )
    sub_forms = [
        SubFormSummary(
            kind="flow_rate_test",
            id=r.id,
            reference=r.reference,
            status=r.status,
            title="Flow rate test (WS-FO-206)",
        )
        for r in flow_rate_rows
    ]
    return Section68Out(
        id=row.id,
        reference=row.reference,
        status=row.status,
        created_at=row.created_at,
        activity_class=row.activity_class,
        activity_subtype=row.activity_subtype,
        is_new_build=row.is_new_build,
        linked_cdc_da_ref=row.linked_cdc_da_ref,
        street_address=row.street_address,
        description=row.description,
        sub_forms=sub_forms,
    )


@router.post("", response_model=Section68Out, status_code=status.HTTP_201_CREATED)
def create(
    body: Section68In,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Section68Out:
    # Validate the subtype against the catalogue so junk values don't land.
    label = _subtype_label(body.activity_class, body.activity_subtype)
    if label == body.activity_subtype:
        raise HTTPException(status_code=422,
                            detail=f"Unknown activity subtype '{body.activity_subtype}' "
                                   f"for Part {body.activity_class}.")
    reference = f"S68-{datetime.now(UTC).strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    row = Section68Application(
        council_id=user.council_id,
        user_id=user.id,
        reference=reference,
        status="submitted",
        submitted_at=datetime.now(UTC),
        activity_class=body.activity_class,
        activity_subtype=body.activity_subtype,
        is_new_build=body.is_new_build,
        linked_cdc_da_ref=body.linked_cdc_da_ref,
        street_address=body.street_address.strip(),
        lot=body.lot,
        dp=body.dp,
        assessment_no=body.assessment_no,
        parcel=body.parcel,
        applicant_name=body.applicant_name.strip(),
        applicant_postal_address=body.applicant_postal_address.strip(),
        contact_phone=body.contact_phone.strip(),
        contact_email=str(body.contact_email),
        description=body.description.strip(),
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialise(row, db)


class Section68ListItem(BaseModel):
    id: int
    reference: str
    status: str
    created_at: datetime
    activity_class: str
    activity_subtype_label: str
    street_address: str
    is_new_build: bool


@router.get("", response_model=list[Section68ListItem])
def list_mine(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Section68ListItem]:
    rows: list[Section68Application] = (
        db.query(Section68Application)
        .filter(
            Section68Application.council_id == user.council_id,
            Section68Application.user_id == user.id,
        )
        .order_by(Section68Application.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        Section68ListItem(
            id=r.id,
            reference=r.reference,
            status=r.status,
            created_at=r.created_at,
            activity_class=r.activity_class,
            activity_subtype_label=_subtype_label(r.activity_class, r.activity_subtype),
            street_address=r.street_address,
            is_new_build=r.is_new_build,
        )
        for r in rows
    ]


@router.get("/{app_id}", response_model=Section68Out)
def get_one(
    app_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Section68Out:
    row = db.get(Section68Application, app_id)
    if row is None or row.council_id != user.council_id or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return _serialise(row, db)
