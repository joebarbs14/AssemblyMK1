"""Announcements: resident feed + staff CRUD."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Announcement,
    AnnouncementAudience,
    AnnouncementStatus,
    User,
    UserRole,
)
from app.schemas.comms import AnnouncementCreate, AnnouncementOut, AnnouncementPatch

router = APIRouter(prefix="/announcements", tags=["announcements"])
staff_router = APIRouter(prefix="/staff/announcements", tags=["staff-announcements"])


def _require_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")
    return user


def _serialize(a: Announcement, author: User | None) -> AnnouncementOut:
    return AnnouncementOut(
        id=a.id,
        title=a.title,
        body_markdown=a.body_markdown,
        audience=a.audience,
        ward_id=a.ward_id,
        category_id=a.category_id,
        status=a.status,
        publish_at=a.publish_at,
        expires_at=a.expires_at,
        author_name=author.name if author else None,
        created_at=a.created_at,
    )


@router.get("", response_model=list[AnnouncementOut])
def list_published(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnnouncementOut]:
    now = datetime.now(UTC)
    rows = (
        db.query(Announcement, User)
        .outerjoin(User, User.id == Announcement.author_user_id)
        .filter(
            Announcement.council_id == user.council_id,
            Announcement.status == AnnouncementStatus.published.value,
            Announcement.publish_at.isnot(None),
            Announcement.publish_at <= now,
        )
        .order_by(Announcement.publish_at.desc())
        .limit(50)
        .all()
    )
    # Filter expired in Python so we don't need a partial index on a nullable col.
    return [
        _serialize(a, author)
        for (a, author) in rows
        if a.expires_at is None or a.expires_at > now
    ]


@router.get("/{ann_id}", response_model=AnnouncementOut)
def get_one(
    ann_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    ann = db.get(Announcement, ann_id)
    if ann is None or ann.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    is_staff = user.role in (UserRole.staff.value, UserRole.admin.value)
    if ann.status != AnnouncementStatus.published.value and not is_staff:
        raise HTTPException(status_code=404, detail="Not found")
    author = db.get(User, ann.author_user_id)
    return _serialize(ann, author)


@staff_router.get("", response_model=list[AnnouncementOut])
def staff_list(
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> list[AnnouncementOut]:
    rows = (
        db.query(Announcement, User)
        .outerjoin(User, User.id == Announcement.author_user_id)
        .filter(Announcement.council_id == user.council_id)
        .order_by(Announcement.created_at.desc())
        .limit(100)
        .all()
    )
    return [_serialize(a, author) for (a, author) in rows]


@staff_router.post("", response_model=AnnouncementOut, status_code=201)
def staff_create(
    body: AnnouncementCreate,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    if body.audience not in {a.value for a in AnnouncementAudience}:
        raise HTTPException(status_code=400, detail="Invalid audience")
    ann = Announcement(
        council_id=user.council_id,
        author_user_id=user.id,
        title=body.title.strip(),
        body_markdown=body.body_markdown,
        audience=body.audience,
        ward_id=body.ward_id,
        category_id=body.category_id,
        status=AnnouncementStatus.draft.value,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return _serialize(ann, user)


@staff_router.patch("/{ann_id}", response_model=AnnouncementOut)
def staff_patch(
    ann_id: int,
    body: AnnouncementPatch,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    ann = db.get(Announcement, ann_id)
    if ann is None or ann.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if body.title is not None:
        ann.title = body.title.strip()
    if body.body_markdown is not None:
        ann.body_markdown = body.body_markdown
    if body.audience is not None:
        if body.audience not in {a.value for a in AnnouncementAudience}:
            raise HTTPException(status_code=400, detail="Invalid audience")
        ann.audience = body.audience
    if body.ward_id is not None:
        ann.ward_id = body.ward_id
    if body.category_id is not None:
        ann.category_id = body.category_id
    db.commit()
    db.refresh(ann)
    return _serialize(ann, db.get(User, ann.author_user_id))


@staff_router.post("/{ann_id}/publish", response_model=AnnouncementOut)
def staff_publish(
    ann_id: int,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    ann = db.get(Announcement, ann_id)
    if ann is None or ann.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    ann.status = AnnouncementStatus.published.value
    if ann.publish_at is None:
        ann.publish_at = datetime.now(UTC)
    db.commit()
    db.refresh(ann)
    return _serialize(ann, db.get(User, ann.author_user_id))


@staff_router.post("/{ann_id}/archive", response_model=AnnouncementOut)
def staff_archive(
    ann_id: int,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    ann = db.get(Announcement, ann_id)
    if ann is None or ann.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    ann.status = AnnouncementStatus.archived.value
    db.commit()
    db.refresh(ann)
    return _serialize(ann, db.get(User, ann.author_user_id))
