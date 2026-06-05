"""v1.x endpoints: animals, dev applications, water, waste schedules.

Read-only resident views for now; full CRUD lands per-module as use cases
appear. Each module is one focused endpoint deep so the dashboard tiles
become live without ballooning scope.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Animal,
    DevelopmentApplication,
    Property,
    PropertyOwnership,
    User,
    WasteCollection,
    WaterConsumption,
)

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
            photo_url=None,  # R2 presign in M9.x once real photos exist
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
        photo_url=None, description=a.description,
    )


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
        for name, kind, day, freq in seeds:
            next_col = today + timedelta(days=(1 - today.weekday()) % 7)  # next Tue-ish
            db.add(WasteCollection(
                council_id=council_id,
                name=name,
                collection_type=kind,
                collection_day=day,
                frequency=freq,
                next_collection=next_col,
            ))
            counts["waste"] += 1

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
