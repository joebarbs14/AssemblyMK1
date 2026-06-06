"""V4 endpoints: disaster dashboard, open data, participatory budgeting,
volunteer matching, tree register, food premises, rangers, fleet,
library, tourism."""
from __future__ import annotations

import csv
import io
import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    BudgetLine,
    CapitalProject,
    DisasterAlert,
    EvacCentre,
    FleetServiceLog,
    FleetVehicle,
    FoodInspection,
    FoodPremises,
    Infringement,
    InfringementAppeal,
    LibraryHold,
    LibraryItem,
    PbProject,
    PbRound,
    PbVote,
    RangerPatrol,
    Report,
    SandbagDepot,
    TourismListing,
    Tree,
    TreeAdoption,
    User,
    UserRole,
    VolunteerOpportunity,
    VolunteerProfile,
    VolunteerSignup,
)

router = APIRouter(tags=["council-v4"])
public_router = APIRouter(prefix="/public", tags=["council-v4-public"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ #1 Disaster dashboard ============


class DisasterAlertOut(BaseModel):
    id: int
    kind: str
    severity: str
    title: str
    body: str
    source: str
    starts_at: datetime
    ends_at: datetime | None


class EvacCentreOut(BaseModel):
    id: int
    name: str
    address: str
    lat: float
    lng: float
    capacity: int | None
    facilities: list[str] | None
    status: str


class SandbagDepotOut(BaseModel):
    id: int
    name: str
    address: str
    lat: float
    lng: float
    bags_available: int
    self_serve: bool
    hours: str | None


@router.get("/disaster/alerts", response_model=list[DisasterAlertOut])
def list_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[DisasterAlertOut]:
    now = datetime.now(UTC)
    rows = (
        db.query(DisasterAlert)
        .filter(
            DisasterAlert.council_id == user.council_id,
            (DisasterAlert.ends_at.is_(None)) | (DisasterAlert.ends_at >= now),
        )
        .order_by(DisasterAlert.starts_at.desc())
        .limit(50)
        .all()
    )
    return [DisasterAlertOut(id=r.id, kind=r.kind, severity=r.severity, title=r.title,
                             body=r.body, source=r.source, starts_at=r.starts_at,
                             ends_at=r.ends_at) for r in rows]


@router.get("/disaster/evac-centres", response_model=list[EvacCentreOut])
def list_evac(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[EvacCentreOut]:
    rows = db.query(EvacCentre).filter(EvacCentre.council_id == user.council_id).all()
    return [EvacCentreOut(id=r.id, name=r.name, address=r.address, lat=r.lat, lng=r.lng,
                          capacity=r.capacity, facilities=r.facilities, status=r.status)
            for r in rows]


@router.get("/disaster/sandbags", response_model=list[SandbagDepotOut])
def list_sandbags(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SandbagDepotOut]:
    rows = db.query(SandbagDepot).filter(SandbagDepot.council_id == user.council_id).all()
    return [SandbagDepotOut(id=r.id, name=r.name, address=r.address, lat=r.lat, lng=r.lng,
                            bags_available=r.bags_available, self_serve=r.self_serve,
                            hours=r.hours) for r in rows]


# ============ #2 Open data ============


def _csv_response(rows: list[list[Any]], filename: str) -> PlainTextResponse:
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@public_router.get("/open-data/budget.csv")
def open_budget(council_slug: str = Query(...), db: Session = Depends(get_db)) -> PlainTextResponse:
    from app.models import Council  # noqa: PLC0415
    c = db.query(Council).filter(Council.slug == council_slug).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Council not found")
    rows: list[list[Any]] = [["fiscal_year", "category", "label", "revenue_cents", "expense_cents"]]
    for line in db.query(BudgetLine).filter(BudgetLine.council_id == c.id).all():
        rows.append([line.fiscal_year, line.category, line.label,
                     line.revenue_cents, line.expense_cents])
    return _csv_response(rows, "budget.csv")


@public_router.get("/open-data/reports.csv")
def open_reports(council_slug: str = Query(...), db: Session = Depends(get_db)) -> PlainTextResponse:
    from app.models import Council  # noqa: PLC0415
    c = db.query(Council).filter(Council.slug == council_slug).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Council not found")
    rows: list[list[Any]] = [["id", "category_id", "status", "lat", "lng", "created_at", "sla_due_at"]]
    for r in db.query(Report).filter(Report.council_id == c.id).limit(10000).all():
        rows.append([r.id, r.category_id, r.status, r.lat, r.lng,
                     r.created_at.isoformat() if r.created_at else None,
                     r.sla_due_at.isoformat() if r.sla_due_at else None])
    return _csv_response(rows, "reports.csv")


@public_router.get("/open-data/projects.csv")
def open_projects(council_slug: str = Query(...), db: Session = Depends(get_db)) -> PlainTextResponse:
    from app.models import Council  # noqa: PLC0415
    c = db.query(Council).filter(Council.slug == council_slug).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Council not found")
    rows: list[list[Any]] = [["id", "title", "category", "budget_cents", "spent_cents", "status"]]
    for p in db.query(CapitalProject).filter(CapitalProject.council_id == c.id).all():
        rows.append([p.id, p.title, p.category, p.budget_cents, p.spent_cents, p.status])
    return _csv_response(rows, "projects.csv")


@public_router.get("/open-data/index")
def open_index(council_slug: str = Query(...)) -> dict[str, Any]:
    return {
        "council_slug": council_slug,
        "datasets": [
            {"name": "Budget lines", "url": f"/api/public/open-data/budget.csv?council_slug={council_slug}", "format": "csv"},
            {"name": "Reports", "url": f"/api/public/open-data/reports.csv?council_slug={council_slug}", "format": "csv"},
            {"name": "Capital projects", "url": f"/api/public/open-data/projects.csv?council_slug={council_slug}", "format": "csv"},
        ],
        "licence": "CC-BY-4.0",
    }


# ============ #3 Participatory budgeting ============


class PbProjectOut(BaseModel):
    id: int
    title: str
    description: str
    requested_cents: int
    image_url: str | None
    votes_tokens: int


class PbRoundOut(BaseModel):
    id: int
    title: str
    description: str
    pool_cents: int
    tokens_per_voter: int
    opens_at: datetime
    closes_at: datetime
    status: str
    projects: list[PbProjectOut]
    tokens_remaining: int  # tokens current user still has to spend


@router.get("/pb/current", response_model=PbRoundOut | None)
def pb_current(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> PbRoundOut | None:
    now = datetime.now(UTC)
    r = (
        db.query(PbRound)
        .filter(PbRound.council_id == user.council_id,
                PbRound.status == "open",
                PbRound.closes_at >= now)
        .order_by(PbRound.closes_at)
        .first()
    )
    if r is None:
        return None
    projects = db.query(PbProject).filter(PbProject.round_id == r.id).all()
    project_ids = [p.id for p in projects]
    tallies: dict[int, int] = {}
    if project_ids:
        for pid, total in (
            db.query(PbVote.project_id, func.coalesce(func.sum(PbVote.tokens), 0))
            .filter(PbVote.project_id.in_(project_ids))
            .group_by(PbVote.project_id)
            .all()
        ):
            tallies[pid] = int(total)
    spent = (
        db.query(func.coalesce(func.sum(PbVote.tokens), 0))
        .join(PbProject, PbProject.id == PbVote.project_id)
        .filter(PbProject.round_id == r.id, PbVote.user_id == user.id)
        .scalar()
        or 0
    )
    return PbRoundOut(
        id=r.id, title=r.title, description=r.description, pool_cents=r.pool_cents,
        tokens_per_voter=r.tokens_per_voter, opens_at=r.opens_at, closes_at=r.closes_at,
        status=r.status, tokens_remaining=max(0, r.tokens_per_voter - int(spent)),
        projects=[PbProjectOut(id=p.id, title=p.title, description=p.description,
                               requested_cents=p.requested_cents, image_url=p.image_url,
                               votes_tokens=int(tallies.get(p.id, 0))) for p in projects],
    )


class PbVoteIn(BaseModel):
    project_id: int
    tokens: int = Field(ge=1, le=100)


@router.post("/pb/vote", status_code=201)
def pb_vote(body: PbVoteIn, user: User = Depends(get_current_user),
            db: Session = Depends(get_db)) -> dict[str, Any]:
    project = db.get(PbProject, body.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    r = db.get(PbRound, project.round_id)
    if r is None or r.council_id != user.council_id or r.status != "open":
        raise HTTPException(status_code=400, detail="Round not open")
    now = datetime.now(UTC)
    if not (r.opens_at <= now <= r.closes_at):
        raise HTTPException(status_code=400, detail="Outside voting window")
    spent = (
        db.query(func.coalesce(func.sum(PbVote.tokens), 0))
        .join(PbProject, PbProject.id == PbVote.project_id)
        .filter(PbProject.round_id == r.id, PbVote.user_id == user.id)
        .scalar()
        or 0
    )
    existing = (
        db.query(PbVote)
        .filter(PbVote.user_id == user.id, PbVote.project_id == project.id)
        .first()
    )
    already = existing.tokens if existing else 0
    if spent - already + body.tokens > r.tokens_per_voter:
        raise HTTPException(status_code=400, detail="Not enough tokens left")
    if existing is None:
        db.add(PbVote(user_id=user.id, project_id=project.id, tokens=body.tokens))
    else:
        existing.tokens = body.tokens
    db.commit()
    return {"ok": True, "tokens_remaining": r.tokens_per_voter - (spent - already + body.tokens)}


# ============ #4 Volunteer matching ============


class VolunteerOpportunityOut(BaseModel):
    id: int
    title: str
    description: str
    skills_needed: list[str]
    location: str | None
    starts_at: datetime
    ends_at: datetime
    capacity: int | None
    status: str
    signed_up: bool
    spots_remaining: int | None


@router.get("/volunteer/opportunities", response_model=list[VolunteerOpportunityOut])
def list_vol(user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> list[VolunteerOpportunityOut]:
    now = datetime.now(UTC)
    rows = (
        db.query(VolunteerOpportunity)
        .filter(VolunteerOpportunity.council_id == user.council_id,
                VolunteerOpportunity.ends_at >= now)
        .order_by(VolunteerOpportunity.starts_at)
        .all()
    )
    ids = [r.id for r in rows]
    counts: dict[int, int] = {}
    if ids:
        for oid, n in (
            db.query(VolunteerSignup.opportunity_id, func.count())
            .filter(VolunteerSignup.opportunity_id.in_(ids),
                    VolunteerSignup.status == "confirmed")
            .group_by(VolunteerSignup.opportunity_id)
            .all()
        ):
            counts[oid] = int(n)
    mine: set[int] = {
        s.opportunity_id for s in
        db.query(VolunteerSignup)
        .filter(VolunteerSignup.user_id == user.id,
                VolunteerSignup.opportunity_id.in_(ids))
        .all()
    } if ids else set()
    return [
        VolunteerOpportunityOut(
            id=r.id, title=r.title, description=r.description,
            skills_needed=r.skills_needed, location=r.location,
            starts_at=r.starts_at, ends_at=r.ends_at, capacity=r.capacity,
            status=r.status, signed_up=r.id in mine,
            spots_remaining=(r.capacity - counts.get(r.id, 0)) if r.capacity else None,
        )
        for r in rows
    ]


@router.post("/volunteer/opportunities/{oid}/signup", status_code=201)
def signup_vol(oid: int, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    o = db.get(VolunteerOpportunity, oid)
    if o is None or o.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if o.status != "open":
        raise HTTPException(status_code=400, detail="Not open")
    existing = (
        db.query(VolunteerSignup)
        .filter(VolunteerSignup.user_id == user.id,
                VolunteerSignup.opportunity_id == oid)
        .first()
    )
    if existing is not None:
        return {"ok": True, "signup_id": existing.id, "status": existing.status}
    s = VolunteerSignup(user_id=user.id, opportunity_id=oid, status="confirmed")
    db.add(s)
    db.commit()
    db.refresh(s)
    from app.services.notify import notify  # noqa: PLC0415
    notify(db, user=user, council_id=user.council_id,
           action="volunteer.signup",
           title=f"You're on the team — {o.title}",
           body=f"Starts {o.starts_at.strftime('%a %d %b, %I:%M %p')}.",
           url="/volunteer", target_type="volunteer_signup", target_id=s.id)
    return {"ok": True, "status": "confirmed"}


@router.delete("/volunteer/opportunities/{oid}/signup", status_code=204)
def cancel_vol(oid: int, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> None:
    s = (
        db.query(VolunteerSignup)
        .filter(VolunteerSignup.user_id == user.id,
                VolunteerSignup.opportunity_id == oid,
                VolunteerSignup.status == "confirmed")
        .first()
    )
    if s is None:
        raise HTTPException(status_code=404, detail="Not signed up")
    db.delete(s)
    db.commit()


class VolProfileIn(BaseModel):
    skills: list[str]
    notes: str | None = None


@router.get("/volunteer/profile")
def get_vol_profile(user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    p = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == user.id).first()
    if p is None:
        return {"skills": [], "hours_total": 0, "notes": None}
    return {"skills": p.skills, "hours_total": p.hours_total, "notes": p.notes}


@router.put("/volunteer/profile")
def set_vol_profile(body: VolProfileIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    p = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == user.id).first()
    if p is None:
        p = VolunteerProfile(user_id=user.id, skills=body.skills, notes=body.notes)
        db.add(p)
    else:
        p.skills = body.skills
        p.notes = body.notes
    db.commit()
    return {"ok": True}


# ============ #5 Tree register ============


class TreeOut(BaseModel):
    id: int
    species_common: str
    species_botanical: str | None
    qr_payload: str
    lat: float
    lng: float
    planted_on: date | None
    canopy_m: float | None
    height_m: float | None
    status: str


@router.get("/trees", response_model=list[TreeOut])
def list_trees(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> list[TreeOut]:
    rows = db.query(Tree).filter(Tree.council_id == user.council_id).limit(500).all()
    return [TreeOut(id=t.id, species_common=t.species_common,
                    species_botanical=t.species_botanical, qr_payload=t.qr_payload,
                    lat=t.lat, lng=t.lng, planted_on=t.planted_on,
                    canopy_m=t.canopy_m, height_m=t.height_m, status=t.status)
            for t in rows]


@public_router.get("/trees/{qr}", response_model=TreeOut)
def get_tree_by_qr(qr: str, db: Session = Depends(get_db)) -> TreeOut:
    t = db.query(Tree).filter(Tree.qr_payload == qr).first()
    if t is None:
        raise HTTPException(status_code=404, detail="Tree not found")
    return TreeOut(id=t.id, species_common=t.species_common,
                   species_botanical=t.species_botanical, qr_payload=t.qr_payload,
                   lat=t.lat, lng=t.lng, planted_on=t.planted_on,
                   canopy_m=t.canopy_m, height_m=t.height_m, status=t.status)


class TreeAdoptIn(BaseModel):
    nickname: str | None = None


@router.post("/trees/{tid}/adopt", status_code=201)
def adopt_tree(tid: int, body: TreeAdoptIn,
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    t = db.get(Tree, tid)
    if t is None or t.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    existing = (
        db.query(TreeAdoption)
        .filter(TreeAdoption.user_id == user.id, TreeAdoption.tree_id == tid)
        .first()
    )
    if existing is not None:
        return {"ok": True, "id": existing.id, "nickname": existing.nickname}
    a = TreeAdoption(user_id=user.id, tree_id=tid, nickname=body.nickname)
    db.add(a)
    db.commit()
    return {"ok": True, "id": a.id, "nickname": a.nickname}


# ============ #6 Food premises ============


class FoodPremisesOut(BaseModel):
    id: int
    name: str
    kind: str
    address: str
    lat: float | None
    lng: float | None
    licence_no: str
    status: str
    latest_grade: str | None
    latest_score: int | None
    latest_inspection: date | None


@router.get("/food-premises", response_model=list[FoodPremisesOut])
def list_food(user: User = Depends(get_current_user),
              db: Session = Depends(get_db)) -> list[FoodPremisesOut]:
    rows = db.query(FoodPremises).filter(FoodPremises.council_id == user.council_id).all()
    pids = [p.id for p in rows]
    latest: dict[int, FoodInspection] = {}
    if pids:
        for row in (
            db.query(FoodInspection)
            .filter(FoodInspection.premises_id.in_(pids))
            .order_by(FoodInspection.inspected_on.desc())
            .all()
        ):
            latest.setdefault(row.premises_id, row)
    out: list[FoodPremisesOut] = []
    for p in rows:
        ins = latest.get(p.id)
        out.append(FoodPremisesOut(
            id=p.id, name=p.name, kind=p.kind, address=p.address, lat=p.lat, lng=p.lng,
            licence_no=p.licence_no, status=p.status,
            latest_grade=ins.grade if ins else None,
            latest_score=ins.score if ins else None,
            latest_inspection=ins.inspected_on if ins else None,
        ))
    return out


# ============ #7 Rangers + infringements ============


class InfringementOut(BaseModel):
    id: int
    kind: str
    code: str
    description: str
    plate: str | None
    fee_cents: int
    issued_at: datetime
    status: str
    lat: float | None
    lng: float | None


class InfringementIn(BaseModel):
    kind: str
    code: str
    description: str
    plate: str | None = None
    lat: float | None = None
    lng: float | None = None
    fee_cents: int = Field(ge=0)


@router.post("/rangers/infringements", response_model=InfringementOut, status_code=201)
def create_infringement(body: InfringementIn,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> InfringementOut:
    _staff(user)
    inf = Infringement(council_id=user.council_id, officer_user_id=user.id,
                       kind=body.kind, code=body.code, description=body.description,
                       plate=body.plate, lat=body.lat, lng=body.lng,
                       fee_cents=body.fee_cents)
    db.add(inf)
    db.commit()
    db.refresh(inf)
    return InfringementOut(id=inf.id, kind=inf.kind, code=inf.code,
                           description=inf.description, plate=inf.plate,
                           fee_cents=inf.fee_cents, issued_at=inf.issued_at,
                           status=inf.status, lat=inf.lat, lng=inf.lng)


@router.get("/rangers/infringements", response_model=list[InfringementOut])
def list_infringements(user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> list[InfringementOut]:
    _staff(user)
    rows = (
        db.query(Infringement)
        .filter(Infringement.council_id == user.council_id)
        .order_by(Infringement.issued_at.desc())
        .limit(100)
        .all()
    )
    return [InfringementOut(id=i.id, kind=i.kind, code=i.code, description=i.description,
                            plate=i.plate, fee_cents=i.fee_cents, issued_at=i.issued_at,
                            status=i.status, lat=i.lat, lng=i.lng) for i in rows]


@router.get("/rangers/patrols", response_model=list[dict[str, Any]])
def list_patrols(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    cutoff = datetime.now(UTC) - timedelta(days=7)
    rows = (
        db.query(RangerPatrol)
        .filter(RangerPatrol.council_id == user.council_id,
                RangerPatrol.starts_at >= cutoff)
        .order_by(RangerPatrol.starts_at.desc())
        .all()
    )
    return [{"id": p.id, "officer_user_id": p.officer_user_id,
             "starts_at": p.starts_at.isoformat(),
             "ends_at": p.ends_at.isoformat() if p.ends_at else None,
             "notes": p.notes} for p in rows]


class AppealIn(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


@router.post("/infringements/{iid}/appeal", status_code=201)
def appeal_infringement(iid: int, body: AppealIn,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    inf = db.get(Infringement, iid)
    if inf is None or inf.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    a = InfringementAppeal(infringement_id=iid, submitted_by_user_id=user.id, reason=body.reason)
    inf.status = "appealed"
    db.add(a)
    db.commit()
    return {"ok": True, "appeal_id": a.id}


# ============ #8 Fleet management ============


class FleetVehicleOut(BaseModel):
    id: int
    rego: str
    make: str
    model: str
    kind: str
    fuel: str
    year: int | None
    odometer_km: int
    last_service_on: date | None
    next_service_due: date | None
    co2_kg_per_km: float
    status: str
    service_overdue: bool


@router.get("/fleet/vehicles", response_model=list[FleetVehicleOut])
def list_fleet(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> list[FleetVehicleOut]:
    _staff(user)
    today = date.today()
    rows = (
        db.query(FleetVehicle)
        .filter(FleetVehicle.council_id == user.council_id)
        .order_by(FleetVehicle.rego)
        .all()
    )
    return [FleetVehicleOut(
        id=v.id, rego=v.rego, make=v.make, model=v.model, kind=v.kind, fuel=v.fuel,
        year=v.year, odometer_km=v.odometer_km, last_service_on=v.last_service_on,
        next_service_due=v.next_service_due, co2_kg_per_km=v.co2_kg_per_km,
        status=v.status,
        service_overdue=(v.next_service_due is not None and v.next_service_due < today),
    ) for v in rows]


@router.get("/fleet/vehicles/{vid}/services")
def vehicle_services(vid: int, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    v = db.get(FleetVehicle, vid)
    if v is None or v.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        db.query(FleetServiceLog)
        .filter(FleetServiceLog.vehicle_id == vid)
        .order_by(FleetServiceLog.serviced_on.desc())
        .all()
    )
    return [{"serviced_on": s.serviced_on.isoformat(), "odometer_km": s.odometer_km,
             "work": s.work, "cost_cents": s.cost_cents, "invoice_ref": s.invoice_ref}
            for s in rows]


# ============ #9 Library ============


class LibraryItemOut(BaseModel):
    id: int
    title: str
    author: str | None
    isbn: str | None
    kind: str
    copies_total: int
    copies_available: int
    cover_url: str | None
    blurb: str | None


@router.get("/library/search", response_model=list[LibraryItemOut])
def lib_search(q: str = Query(default="", max_length=200),
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> list[LibraryItemOut]:
    query = db.query(LibraryItem).filter(LibraryItem.council_id == user.council_id)
    if q:
        like = f"%{q}%"
        query = query.filter((LibraryItem.title.ilike(like)) | (LibraryItem.author.ilike(like)))
    rows = query.order_by(LibraryItem.title).limit(50).all()
    return [LibraryItemOut(
        id=i.id, title=i.title, author=i.author, isbn=i.isbn, kind=i.kind,
        copies_total=i.copies_total, copies_available=i.copies_available,
        cover_url=i.cover_url, blurb=i.blurb,
    ) for i in rows]


@router.post("/library/{iid}/hold", status_code=201)
def lib_hold(iid: int, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> dict[str, Any]:
    item = db.get(LibraryItem, iid)
    if item is None or item.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    h = LibraryHold(user_id=user.id, item_id=iid,
                    status="ready" if item.copies_available > 0 else "queued")
    if item.copies_available > 0:
        item.copies_available -= 1
        h.ready_at = datetime.now(UTC)
    db.add(h)
    db.commit()
    db.refresh(h)
    from app.services.notify import notify  # noqa: PLC0415
    if h.status == "ready":
        notify(db, user=user, council_id=user.council_id,
               action="library.hold_ready",
               title="Your hold is ready",
               body=f"'{item.title}' is ready to collect from the library.",
               url="/library", target_type="library_hold", target_id=h.id)
    else:
        notify(db, user=user, council_id=user.council_id,
               action="library.hold_queued",
               title="In the hold queue",
               body=f"'{item.title}' — we'll notify you when it's ready.",
               url="/library", target_type="library_hold", target_id=h.id)
    return {"ok": True, "hold_id": h.id, "status": h.status}


@router.delete("/library/holds/{hid}", status_code=204)
def cancel_hold(hid: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> None:
    h = db.get(LibraryHold, hid)
    if h is None or h.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if h.status == "ready":
        item = db.get(LibraryItem, h.item_id)
        if item is not None:
            item.copies_available += 1
    h.status = "expired"
    db.commit()


@router.get("/library/mine")
def my_holds(user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(LibraryHold, LibraryItem)
        .join(LibraryItem, LibraryItem.id == LibraryHold.item_id)
        .filter(LibraryHold.user_id == user.id)
        .order_by(LibraryHold.created_at.desc())
        .all()
    )
    return [{"hold_id": h.id, "status": h.status, "item_id": item.id,
             "title": item.title, "author": item.author, "kind": item.kind,
             "ready_at": h.ready_at.isoformat() if h.ready_at else None,
             "created_at": h.created_at.isoformat()}
            for h, item in rows]


# ============ #10 Tourism ============


class TourismOut(BaseModel):
    id: int
    kind: str
    name: str
    blurb: str
    image_url: str | None
    lat: float | None
    lng: float | None
    address: str | None
    url: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    tags: list[str] | None


@router.get("/tourism", response_model=list[TourismOut])
def list_tourism(kind: str | None = None,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[TourismOut]:
    q = db.query(TourismListing).filter(TourismListing.council_id == user.council_id)
    if kind:
        q = q.filter(TourismListing.kind == kind)
    now = datetime.now(UTC)
    rows = q.filter((TourismListing.ends_at.is_(None)) | (TourismListing.ends_at >= now)).limit(200).all()
    return [TourismOut(id=t.id, kind=t.kind, name=t.name, blurb=t.blurb,
                       image_url=t.image_url, lat=t.lat, lng=t.lng, address=t.address,
                       url=t.url, starts_at=t.starts_at, ends_at=t.ends_at, tags=t.tags)
            for t in rows]


# ============ Demo seed ============


def seed_v4_demo(db: Session, *, council_id: int) -> dict[str, int]:
    counts = {"alerts": 0, "evac": 0, "sandbags": 0, "pb": 0, "vol": 0,
              "trees": 0, "food": 0, "fleet": 0, "library": 0, "tourism": 0}
    now = datetime.now(UTC)
    today = date.today()

    # Disaster
    if not db.query(DisasterAlert).filter(DisasterAlert.council_id == council_id).first():
        db.add(DisasterAlert(
            council_id=council_id, kind="heatwave", severity="watch",
            title="Heatwave warning — Saturday onwards",
            body="BoM forecasting 40°C+ for 4 consecutive days. Check on elderly neighbours. "
                 "Cooling centres open at the Senior Centre and Library.",
            source="bom", starts_at=now + timedelta(days=2),
            ends_at=now + timedelta(days=6),
            affected_wards=["all"],
        ))
        counts["alerts"] += 1
    if not db.query(EvacCentre).filter(EvacCentre.council_id == council_id).first():
        evac = [
            ("Leeton Showground Pavilion", "1 Petersham Rd, Leeton", -34.555, 146.400,
             500, ["pets", "kitchen", "shower", "wheelchair", "generator"], "standby"),
            ("Senior Citizens Centre", "Pine Ave, Leeton", -34.554, 146.402,
             120, ["kitchen", "shower", "wheelchair"], "standby"),
        ]
        for name, addr, lat, lng, cap, fac, status in evac:
            db.add(EvacCentre(council_id=council_id, name=name, address=addr,
                              lat=lat, lng=lng, capacity=cap, facilities=fac, status=status))
            counts["evac"] += 1
    if not db.query(SandbagDepot).filter(SandbagDepot.council_id == council_id).first():
        for name, addr, lat, lng, bags in [
            ("Leeton Works Depot", "Yanco Rd, Leeton", -34.560, 146.395, 1200),
            ("Whitton Rural Fire Shed", "Main St, Whitton", -34.500, 146.190, 400),
        ]:
            db.add(SandbagDepot(council_id=council_id, name=name, address=addr,
                                lat=lat, lng=lng, bags_available=bags,
                                self_serve=True, hours="24/7 self-serve"))
            counts["sandbags"] += 1

    # Participatory budgeting
    if not db.query(PbRound).filter(PbRound.council_id == council_id).first():
        rnd = PbRound(council_id=council_id, title="2026 Community Choice",
                      description="You decide where $250,000 of community capital goes. "
                                  "10 tokens per resident, split them how you like.",
                      pool_cents=25000000, tokens_per_voter=10,
                      opens_at=now - timedelta(days=1),
                      closes_at=now + timedelta(days=30), status="open")
        db.add(rnd)
        db.flush()
        for title, desc, req in [
            ("Skate park upgrade", "Modernise the Leeton skate park with new ramps and lighting.", 80000_00),
            ("Yanco Creek footbridge", "Pedestrian bridge across Yanco Creek for school kids.", 120000_00),
            ("Community garden expansion", "Double the size of the garden, add raised accessible beds.", 35000_00),
            ("Pump track for BMX", "All-weather concrete pump track behind the showground.", 55000_00),
        ]:
            db.add(PbProject(round_id=rnd.id, title=title, description=desc, requested_cents=req))
            counts["pb"] += 1

    # Volunteer
    if not db.query(VolunteerOpportunity).filter(VolunteerOpportunity.council_id == council_id).first():
        for title, desc, skills, loc, st, en, cap in [
            ("Library reading circle", "Read with kids 5-8yrs every Saturday morning.",
             ["education", "kids"], "Library, Main St",
             now + timedelta(days=5, hours=10), now + timedelta(days=5, hours=12), 6),
            ("Tree planting day", "Plant 200 trees along Yanco Creek bank.",
             ["physical", "outdoors"], "Yanco Creek reserve",
             now + timedelta(days=12, hours=8), now + timedelta(days=12, hours=14), 30),
            ("RFS training day", "Quarterly RFS volunteer training session.",
             ["rfs", "first_aid"], "Leeton RFS shed",
             now + timedelta(days=20, hours=9), now + timedelta(days=20, hours=16), 20),
        ]:
            db.add(VolunteerOpportunity(council_id=council_id, title=title, description=desc,
                                        skills_needed=skills, location=loc, starts_at=st,
                                        ends_at=en, capacity=cap, status="open"))
            counts["vol"] += 1

    # Trees
    if not db.query(Tree).filter(Tree.council_id == council_id).first():
        species = [
            ("River red gum", "Eucalyptus camaldulensis", -34.554, 146.402, 12.5, 18.0),
            ("Jacaranda", "Jacaranda mimosifolia", -34.555, 146.401, 7.0, 9.0),
            ("Lemon-scented gum", "Corymbia citriodora", -34.553, 146.404, 9.5, 14.0),
            ("Plane tree", "Platanus × acerifolia", -34.556, 146.400, 11.0, 16.5),
            ("Crepe myrtle", "Lagerstroemia indica", -34.557, 146.403, 4.0, 5.5),
        ]
        for sp, bot, lat, lng, can, h in species:
            db.add(Tree(council_id=council_id, species_common=sp, species_botanical=bot,
                        qr_payload=secrets.token_urlsafe(10), lat=lat, lng=lng,
                        planted_on=today - timedelta(days=365 * 8),
                        canopy_m=can, height_m=h, status="healthy"))
            counts["trees"] += 1

    # Food premises
    if not db.query(FoodPremises).filter(FoodPremises.council_id == council_id).first():
        for name, kind, addr, lic, grade, score in [
            ("Roxy Café", "cafe", "112 Pine Ave, Leeton", "FP-2024-0011", "A", 96),
            ("Hydro Hotel Bistro", "restaurant", "53 Chelmsford Pl, Leeton", "FP-2024-0042", "A", 92),
            ("Murrumbidgee Bakery", "takeaway", "8 Wade St, Leeton", "FP-2023-0099", "B", 81),
            ("Yanco Service Station", "grocer", "Newell Hwy, Yanco", "FP-2024-0118", "A", 90),
        ]:
            p = FoodPremises(council_id=council_id, name=name, kind=kind, address=addr,
                             licence_no=lic, status="active")
            db.add(p)
            db.flush()
            db.add(FoodInspection(premises_id=p.id, inspected_on=today - timedelta(days=30),
                                  score=score, grade=grade,
                                  issues=None if grade == "A" else ["minor cleaning"]))
            counts["food"] += 1

    # Fleet
    if not db.query(FleetVehicle).filter(FleetVehicle.council_id == council_id).first():
        for rego, mk, md, kind, fuel, yr, km, co2, due in [
            ("CL-001", "Isuzu", "FRR110-260", "truck", "diesel", 2019, 142000, 0.62, today + timedelta(days=10)),
            ("CL-014", "Toyota", "HiLux SR", "truck", "diesel", 2022, 38000, 0.21, today + timedelta(days=90)),
            ("CL-022", "John Deere", "5075E", "tractor", "diesel", 2018, 4500, 0.95, today - timedelta(days=5)),
            ("CL-040", "Tesla", "Model Y", "car", "ev", 2024, 15000, 0.0, today + timedelta(days=200)),
            ("CL-051", "Hustler", "Raptor 60", "mower", "petrol", 2021, 1200, 0.5, today + timedelta(days=30)),
        ]:
            db.add(FleetVehicle(council_id=council_id, rego=rego, make=mk, model=md,
                                kind=kind, fuel=fuel, year=yr, odometer_km=km,
                                last_service_on=today - timedelta(days=120),
                                next_service_due=due, co2_kg_per_km=co2, status="active"))
            counts["fleet"] += 1

    # Library
    if not db.query(LibraryItem).filter(LibraryItem.council_id == council_id).first():
        for title, author, isbn, kind, total, avail, blurb in [
            ("The Yield", "Tara June Winch", "9780525541127", "book", 3, 2,
             "Miles Franklin winner. A story of language, land and family."),
            ("Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", "9780593321201", "book", 2, 0,
             "Two friends building video games over three decades."),
            ("The Australian Bird Guide", "Menkhorst et al.", "9780643097544", "book", 1, 1,
             "Comprehensive field guide. Excellent illustrations."),
            ("Mad Max: Fury Road", None, None, "dvd", 2, 2, "Blu-ray. Classic."),
            ("Cricket Australia 2024-25 Yearbook", None, None, "magazine", 1, 1, "Season review."),
        ]:
            db.add(LibraryItem(council_id=council_id, title=title, author=author, isbn=isbn,
                               kind=kind, copies_total=total, copies_available=avail, blurb=blurb))
            counts["library"] += 1

    # Tourism
    if not db.query(TourismListing).filter(TourismListing.council_id == council_id).first():
        tourism_rows: list[tuple[str, str, str, float, float, str, list[str], datetime | None, datetime | None]] = [
            ("attraction", "Roxy Theatre", "1930s Spanish Mission cinema, still showing films.",
             -34.556, 146.402, "118 Pine Ave, Leeton", ["heritage", "cinema"], None, None),
            ("trail", "Murrumbidgee River Walk", "8km flat loop along the river, sealed.",
             -34.560, 146.390, "Mountford Park trailhead", ["walking", "easy"], None, None),
            ("event", "Leeton SunRice Festival", "Bi-annual harvest celebration.",
             -34.555, 146.401, "Town centre",
             ["festival", "family"],
             now + timedelta(days=60), now + timedelta(days=63)),
            ("lodging", "Hydro Motor Inn", "Heritage hotel on the main avenue.",
             -34.555, 146.402, "53 Chelmsford Pl, Leeton",
             ["hotel", "heritage"], None, None),
            ("food", "Roxy Café", "Brunch, coffee, regional produce.",
             -34.556, 146.402, "112 Pine Ave, Leeton", ["cafe"], None, None),
        ]
        for t_kind, t_name, t_blurb, t_lat, t_lng, t_addr, t_tags, t_st, t_en in tourism_rows:
            db.add(TourismListing(council_id=council_id, kind=t_kind, name=t_name, blurb=t_blurb,
                                  lat=t_lat, lng=t_lng, address=t_addr, tags=t_tags,
                                  starts_at=t_st, ends_at=t_en))
            counts["tourism"] += 1

    db.commit()
    return counts
