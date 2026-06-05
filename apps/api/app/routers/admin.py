"""Admin endpoints — users, categories, audit log."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    AuditEvent,
    ReportCategory,
    User,
    UserRole,
    UserStatus,
)
from app.schemas.comms import AuditEventOut
from app.services import audit

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


# --- Users ---


class AdminUserOut(BaseModel):
    id: int
    email: str
    name: str | None
    role: str
    status: str


class AdminInviteIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(pattern="^(staff|admin)$")


class AdminUserPatch(BaseModel):
    role: str | None = Field(default=None, pattern="^(resident|staff|admin)$")
    status: str | None = Field(default=None, pattern="^(invited|active|disabled)$")


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> list[AdminUserOut]:
    rows = (
        db.query(User)
        .filter(User.council_id == user.council_id)
        .order_by(User.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        AdminUserOut(id=u.id, email=u.email, name=u.name, role=u.role, status=u.status)
        for u in rows
    ]


@router.post("/users", response_model=AdminUserOut, status_code=201)
def invite_user(
    body: AdminInviteIn,
    request: Request,
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> AdminUserOut:
    email = body.email.lower().strip()
    if (
        db.query(User)
        .filter(User.council_id == user.council_id, User.email == email)
        .first()
        is not None
    ):
        raise HTTPException(status_code=409, detail="User already exists")
    new = User(
        council_id=user.council_id,
        email=email,
        name=body.name.strip(),
        role=body.role,
        status=UserStatus.invited.value,
    )
    db.add(new)
    db.commit()
    db.refresh(new)
    audit.record(
        db,
        actor=user,
        action="user.invite",
        target_type="user",
        target_id=new.id,
        metadata={"role": body.role},
        request=request,
    )
    return AdminUserOut(id=new.id, email=new.email, name=new.name, role=new.role, status=new.status)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def patch_user(
    user_id: int,
    body: AdminUserPatch,
    request: Request,
    actor: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> AdminUserOut:
    target = db.get(User, user_id)
    if target is None or target.council_id != actor.council_id:
        raise HTTPException(status_code=404, detail="User not found")
    changes: dict[str, str] = {}
    if body.role is not None and body.role != target.role:
        changes["role"] = f"{target.role}->{body.role}"
        target.role = body.role
    if body.status is not None and body.status != target.status:
        changes["status"] = f"{target.status}->{body.status}"
        target.status = body.status
    if changes:
        db.commit()
        db.refresh(target)
        audit.record(
            db, actor=actor, action="user.patch", target_type="user",
            target_id=target.id, metadata=changes, request=request,
        )
    return AdminUserOut(
        id=target.id, email=target.email, name=target.name, role=target.role, status=target.status
    )


# --- Report categories ---


class AdminCategoryOut(BaseModel):
    id: int
    key: str
    label: str
    icon: str | None
    sla_hours: int
    requires_photo: bool
    is_active: bool


class AdminCategoryIn(BaseModel):
    key: str = Field(min_length=2, max_length=64)
    label: str = Field(min_length=2, max_length=120)
    icon: str | None = None
    sla_hours: int = Field(default=72, ge=1, le=2160)
    requires_photo: bool = False
    is_active: bool = True


class AdminCategoryPatch(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    icon: str | None = None
    sla_hours: int | None = Field(default=None, ge=1, le=2160)
    requires_photo: bool | None = None
    is_active: bool | None = None


@router.get("/categories", response_model=list[AdminCategoryOut])
def list_categories(
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> list[AdminCategoryOut]:
    rows = (
        db.query(ReportCategory)
        .filter(ReportCategory.council_id == user.council_id)
        .order_by(ReportCategory.label)
        .all()
    )
    return [
        AdminCategoryOut(
            id=c.id, key=c.key, label=c.label, icon=c.icon,
            sla_hours=c.sla_hours, requires_photo=c.requires_photo, is_active=c.is_active,
        )
        for c in rows
    ]


@router.post("/categories", response_model=AdminCategoryOut, status_code=201)
def create_category(
    body: AdminCategoryIn,
    request: Request,
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> AdminCategoryOut:
    existing = (
        db.query(ReportCategory)
        .filter(ReportCategory.council_id == user.council_id, ReportCategory.key == body.key)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Category key already exists")
    cat = ReportCategory(
        council_id=user.council_id,
        key=body.key,
        label=body.label,
        icon=body.icon,
        sla_hours=body.sla_hours,
        requires_photo=body.requires_photo,
        is_active=body.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    audit.record(
        db, actor=user, action="category.create", target_type="category",
        target_id=cat.id, metadata={"key": cat.key}, request=request,
    )
    return AdminCategoryOut(
        id=cat.id, key=cat.key, label=cat.label, icon=cat.icon,
        sla_hours=cat.sla_hours, requires_photo=cat.requires_photo, is_active=cat.is_active,
    )


@router.patch("/categories/{cat_id}", response_model=AdminCategoryOut)
def patch_category(
    cat_id: int,
    body: AdminCategoryPatch,
    request: Request,
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> AdminCategoryOut:
    cat = db.get(ReportCategory, cat_id)
    if cat is None or cat.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Category not found")
    changes: dict[str, str] = {}
    for field in ("label", "icon", "sla_hours", "requires_photo", "is_active"):
        new = getattr(body, field)
        if new is not None and new != getattr(cat, field):
            changes[field] = f"{getattr(cat, field)}->{new}"
            setattr(cat, field, new)
    if changes:
        db.commit()
        db.refresh(cat)
        audit.record(
            db, actor=user, action="category.patch", target_type="category",
            target_id=cat.id, metadata=changes, request=request,
        )
    return AdminCategoryOut(
        id=cat.id, key=cat.key, label=cat.label, icon=cat.icon,
        sla_hours=cat.sla_hours, requires_photo=cat.requires_photo, is_active=cat.is_active,
    )


# --- Audit log ---


@router.get("/audit", response_model=list[AuditEventOut])
def list_audit(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> list[AuditEventOut]:
    rows = (
        db.query(AuditEvent, User)
        .outerjoin(User, User.id == AuditEvent.actor_user_id)
        .filter(AuditEvent.council_id == user.council_id)
        .order_by(AuditEvent.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        AuditEventOut(
            id=e.id,
            actor_user_id=e.actor_user_id,
            actor_name=actor.name if actor else None,
            action=e.action,
            target_type=e.target_type,
            target_id=e.target_id,
            ip_address=e.ip_address,
            created_at=e.created_at,
        )
        for (e, actor) in rows
    ]
