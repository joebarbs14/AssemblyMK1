"""v1.x endpoints: animals, dev applications, water, waste schedules.

Read-only resident views for now; full CRUD lands per-module as use cases
appear. Each module is one focused endpoint deep so the dashboard tiles
become live without ballooning scope.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    AdoptionApplication,
    AdoptionStatus,
    Animal,
    DAStatus,
    DevelopmentApplication,
    Property,
    PropertyOwnership,
    User,
    WasteCollection,
    WaterConsumption,
)
from app.services import r2

router = APIRouter(tags=["v1x"])


# --- M9 Animals ---


class AnimalOut(BaseModel):
    id: int
    name: str
    species: str
    breed: str | None
    sex: str | None
    age_years: float | None
    temperament: str | None
    status: str
    photo_url: str | None
    description: str | None


@router.get("/animals", response_model=list[AnimalOut])
def list_animals(
    species: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnimalOut]:
    q = (
        db.query(Animal)
        .filter(Animal.council_id == user.council_id, Animal.status == "available")
    )
    if species:
        q = q.filter(Animal.species == species)
    rows = q.order_by(Animal.listed_at.desc()).limit(50).all()
    return [
        AnimalOut(
            id=a.id,
            name=a.name,
            species=a.species,
            breed=a.breed,
            sex=a.sex,
            age_years=a.age_years,
            temperament=a.temperament,
            status=a.status,
            photo_url=r2.presign_get(a.main_photo_r2_key) if a.main_photo_r2_key else None,
            description=a.description,
        )
        for a in rows
    ]


@router.get("/animals/{animal_id}", response_model=AnimalOut)
def get_animal(
    animal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnimalOut:
    a = db.get(Animal, animal_id)
    if a is None or a.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Animal not found")
    return AnimalOut(
        id=a.id, name=a.name, species=a.species, breed=a.breed, sex=a.sex,
        age_years=a.age_years, temperament=a.temperament, status=a.status,
        photo_url=r2.presign_get(a.main_photo_r2_key) if a.main_photo_r2_key else None,
        description=a.description,
    )


# --- M9.x: Apply to adopt ---


class AdoptionApplicationIn(BaseModel):
    phone: str | None = None
    has_other_pets: bool = False
    home_type: str | None = None
    why_this_animal: str = Field(min_length=10, max_length=2000)


class AdoptionApplicationOut(BaseModel):
    id: int
    animal_id: int
    animal_name: str
    status: str
    why_this_animal: str
    has_other_pets: bool
    home_type: str | None
    created_at: datetime


@router.post(
    "/animals/{animal_id}/apply",
    response_model=AdoptionApplicationOut,
    status_code=201,
)
def apply_to_adopt(
    animal_id: int,
    body: AdoptionApplicationIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdoptionApplicationOut:
    a = db.get(Animal, animal_id)
    if a is None or a.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Animal not found")
    if a.status != "available":
        raise HTTPException(
            status_code=400,
            detail=f"This animal is no longer available ({a.status})",
        )
    # Prevent duplicate pending applications for the same animal.
    existing = (
        db.query(AdoptionApplication)
        .filter(
            AdoptionApplication.animal_id == a.id,
            AdoptionApplication.applicant_user_id == user.id,
            AdoptionApplication.status == AdoptionStatus.pending.value,
        )
        .first()
    )
    if existing is not None:
        return AdoptionApplicationOut(
            id=existing.id, animal_id=a.id, animal_name=a.name,
            status=existing.status, why_this_animal=existing.why_this_animal,
            has_other_pets=existing.has_other_pets, home_type=existing.home_type,
            created_at=existing.created_at,
        )

    app_row = AdoptionApplication(
        council_id=user.council_id,
        animal_id=a.id,
        applicant_user_id=user.id,
        phone=body.phone,
        has_other_pets=body.has_other_pets,
        home_type=body.home_type,
        why_this_animal=body.why_this_animal,
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    return AdoptionApplicationOut(
        id=app_row.id, animal_id=a.id, animal_name=a.name,
        status=app_row.status, why_this_animal=app_row.why_this_animal,
        has_other_pets=app_row.has_other_pets, home_type=app_row.home_type,
        created_at=app_row.created_at,
    )


@router.get("/account/adoption-applications", response_model=list[AdoptionApplicationOut])
def list_my_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AdoptionApplicationOut]:
    rows = (
        db.query(AdoptionApplication, Animal)
        .join(Animal, Animal.id == AdoptionApplication.animal_id)
        .filter(AdoptionApplication.applicant_user_id == user.id)
        .order_by(AdoptionApplication.created_at.desc())
        .all()
    )
    return [
        AdoptionApplicationOut(
            id=app_row.id, animal_id=animal.id, animal_name=animal.name,
            status=app_row.status, why_this_animal=app_row.why_this_animal,
            has_other_pets=app_row.has_other_pets, home_type=app_row.home_type,
            created_at=app_row.created_at,
        )
        for (app_row, animal) in rows
    ]


# --- M10 Development applications ---


class DAOut(BaseModel):
    id: int
    da_number: str
    application_type: str
    description: str
    estimated_cost_cents: int | None
    status: str
    submission_date: date
    decision_date: date | None
    exhibition_ends_at: date | None


@router.get("/development", response_model=list[DAOut])
def list_das(
    mine: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DAOut]:
    q = db.query(DevelopmentApplication).filter(
        DevelopmentApplication.council_id == user.council_id,
        DevelopmentApplication.public.is_(True),
    )
    if mine:
        q = q.filter(DevelopmentApplication.applicant_user_id == user.id)
    rows = q.order_by(DevelopmentApplication.submission_date.desc()).limit(50).all()
    return [
        DAOut(
            id=d.id,
            da_number=d.da_number,
            application_type=d.application_type,
            description=d.description,
            estimated_cost_cents=d.estimated_cost_cents,
            status=d.status,
            submission_date=d.submission_date,
            decision_date=d.decision_date,
            exhibition_ends_at=d.exhibition_ends_at,
        )
        for d in rows
    ]


class DACreateIn(BaseModel):
    application_type: str = Field(min_length=2, max_length=64)
    description: str = Field(min_length=10, max_length=4000)
    estimated_cost_cents: int | None = Field(default=None, ge=0)
    property_id: int | None = None


@router.post("/development", response_model=DAOut, status_code=201)
def submit_da(
    body: DACreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DAOut:
    if body.property_id is not None:
        prop = db.get(Property, body.property_id)
        if prop is None or prop.council_id != user.council_id:
            raise HTTPException(status_code=400, detail="Unknown property")
        own = (
            db.query(PropertyOwnership)
            .filter(
                PropertyOwnership.property_id == prop.id,
                PropertyOwnership.user_id == user.id,
            )
            .first()
        )
        if own is None:
            raise HTTPException(status_code=403, detail="You don't own that property")

    today = date.today()
    # Generate a DA number: DA-YYYY-XXXX (counted within the council/year).
    year_count = (
        db.query(DevelopmentApplication)
        .filter(
            DevelopmentApplication.council_id == user.council_id,
            DevelopmentApplication.submission_date >= date(today.year, 1, 1),
        )
        .count()
    )
    da_number = f"DA-{today.year}-{(year_count + 1):04d}"

    da = DevelopmentApplication(
        council_id=user.council_id,
        applicant_user_id=user.id,
        property_id=body.property_id,
        da_number=da_number,
        application_type=body.application_type,
        description=body.description,
        estimated_cost_cents=body.estimated_cost_cents,
        status=DAStatus.submitted.value,
        submission_date=today,
        public=True,
    )
    db.add(da)
    db.commit()
    db.refresh(da)
    return DAOut(
        id=da.id, da_number=da.da_number, application_type=da.application_type,
        description=da.description, estimated_cost_cents=da.estimated_cost_cents,
        status=da.status, submission_date=da.submission_date,
        decision_date=da.decision_date, exhibition_ends_at=da.exhibition_ends_at,
    )


# --- M11 Water consumption ---


class WaterRow(BaseModel):
    quarter_start: date
    quarter_end: date
    consumed_litres: int
    allocated_litres: int | None
    amount_owing_cents: int
    bill_due_date: date | None


@router.get("/water/properties/{property_id}", response_model=list[WaterRow])
def water_for_property(
    property_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WaterRow]:
    prop = db.get(Property, property_id)
    if prop is None or prop.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Property not found")
    own = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.property_id == prop.id, PropertyOwnership.user_id == user.id)
        .first()
    )
    if own is None:
        raise HTTPException(status_code=404, detail="Property not found")
    rows = (
        db.query(WaterConsumption)
        .filter(WaterConsumption.property_id == prop.id)
        .order_by(WaterConsumption.quarter_start.desc())
        .all()
    )
    return [
        WaterRow(
            quarter_start=r.quarter_start,
            quarter_end=r.quarter_end,
            consumed_litres=r.consumed_litres,
            allocated_litres=r.allocated_litres,
            amount_owing_cents=r.amount_owing_cents,
            bill_due_date=r.bill_due_date,
        )
        for r in rows
    ]


# --- M12 Waste schedules ---


class WasteRow(BaseModel):
    id: int
    name: str
    collection_type: str
    collection_day: str
    frequency: str
    next_collection: date | None
    notes: str | None


@router.get("/waste", response_model=list[WasteRow])
def list_waste(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WasteRow]:
    rows = (
        db.query(WasteCollection)
        .filter(WasteCollection.council_id == user.council_id)
        .order_by(WasteCollection.collection_day)
        .all()
    )
    return [
        WasteRow(
            id=w.id,
            name=w.name,
            collection_type=w.collection_type,
            collection_day=w.collection_day,
            frequency=w.frequency,
            next_collection=w.next_collection,
            notes=w.notes,
        )
        for w in rows
    ]


class MyWasteRow(BaseModel):
    property_id: int
    property_address: str
    route: WasteRow | None


@router.get("/waste/mine", response_model=list[MyWasteRow])
def my_waste(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MyWasteRow]:
    """Per-property bin schedule for the resident's properties."""
    props = (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(
            PropertyOwnership.user_id == user.id,
            Property.council_id == user.council_id,
        )
        .all()
    )
    out: list[MyWasteRow] = []
    for p in props:
        route_obj = (
            db.get(WasteCollection, p.waste_route_id) if p.waste_route_id else None
        )
        out.append(
            MyWasteRow(
                property_id=p.id,
                property_address=p.address,
                route=(
                    WasteRow(
                        id=route_obj.id,
                        name=route_obj.name,
                        collection_type=route_obj.collection_type,
                        collection_day=route_obj.collection_day,
                        frequency=route_obj.frequency,
                        next_collection=route_obj.next_collection,
                        notes=route_obj.notes,
                    )
                    if route_obj
                    else None
                ),
            )
        )
    return out


# --- Seed extension for the demo property ---


def seed_demo_extras(db: Session, *, council_id: int, property_id: int) -> dict[str, Any]:
    """Adds 4 water quarters, 3 waste routes, 1 animal, 2 DAs to the demo council/property.
    Idempotent: skipped if any of each kind already exist."""
    today = date.today()
    counts = {"water": 0, "waste": 0, "animals": 0, "das": 0}

    if not db.query(WaterConsumption).filter(WaterConsumption.property_id == property_id).first():
        for i, used in enumerate([42000, 38000, 51000, 47000]):
            qs = date(today.year, max(1, today.month - 3 - i * 3), 1)
            qe = qs + timedelta(days=90)
            db.add(WaterConsumption(
                property_id=property_id,
                quarter_start=qs,
                quarter_end=qe,
                consumed_litres=used,
                allocated_litres=60000,
                amount_owing_cents=used * 2 // 1000,
            ))
            counts["water"] += 1

    if not db.query(WasteCollection).filter(WasteCollection.council_id == council_id).first():
        seeds = [
            ("Tuesday general", "general", "Tue", "weekly"),
            ("Tuesday recycling", "recycling", "Tue", "fortnightly"),
            ("Friday green waste", "green", "Fri", "fortnightly"),
        ]
        first_id: int | None = None
        for name, kind, day, freq in seeds:
            next_col = today + timedelta(days=(1 - today.weekday()) % 7)
            w = WasteCollection(
                council_id=council_id,
                name=name,
                collection_type=kind,
                collection_day=day,
                frequency=freq,
                next_collection=next_col,
            )
            db.add(w)
            db.flush()
            first_id = first_id or w.id
            counts["waste"] += 1
        # Link the demo property to the general route so the resident's
        # /waste view shows 'Your bin night is Tuesday' instead of just a
        # list of all routes.
        prop = db.get(Property, property_id)
        if prop is not None and first_id is not None and prop.waste_route_id is None:
            prop.waste_route_id = first_id

    if not db.query(Animal).filter(Animal.council_id == council_id).first():
        animals_data = [
            ("Pepper", "dog", "Kelpie cross", "F", 2.5, "Friendly, energetic",
             "Loves a long walk and a tennis ball. Great with kids."),
            ("Whiskey", "cat", "Domestic short hair", "M", 4.0, "Quiet, affectionate",
             "Prefers a calm home. Indoor only."),
            ("Mango", "dog", "Staffy", "F", 5.0, "Calm, gentle",
             "Past her zoomie years. Loves a cuddle."),
        ]
        for name, sp, breed, sex, age, temper, desc in animals_data:
            db.add(Animal(
                council_id=council_id,
                name=name, species=sp, breed=breed, sex=sex,
                age_years=age, temperament=temper, description=desc, status="available",
            ))
            counts["animals"] += 1

    if not db.query(DevelopmentApplication).filter(
        DevelopmentApplication.council_id == council_id
    ).first():
        das_data = [
            ("DA-2026-0042", "Single-storey extension", "Rear extension to add a 4m x 5m living area.",
             8500000, "under_review", today - timedelta(days=18), None),
            ("DA-2026-0019", "Shed/outbuilding", "5m x 3m garden shed at rear of property.",
             450000, "approved", today - timedelta(days=42), today - timedelta(days=10)),
            ("DA-2026-0007", "Subdivision", "Two-lot subdivision of 800 m2 site.",
             0, "on_exhibition", today - timedelta(days=8),
             today + timedelta(days=14)),
        ]
        for num, kind, desc, cost, st, sub, exh in das_data:
            db.add(DevelopmentApplication(
                council_id=council_id,
                applicant_user_id=None,
                property_id=property_id,
                da_number=num,
                application_type=kind,
                description=desc,
                estimated_cost_cents=cost,
                status=st,
                submission_date=sub,
                exhibition_ends_at=exh,
            ))
            counts["das"] += 1

    db.commit()
    return counts
