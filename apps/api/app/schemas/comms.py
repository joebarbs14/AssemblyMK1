from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AnnouncementOut(BaseModel):
    id: int
    title: str
    body_markdown: str
    audience: str
    ward_id: int | None
    category_id: int | None
    status: str
    publish_at: datetime | None
    expires_at: datetime | None
    author_name: str | None
    created_at: datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body_markdown: str = Field(min_length=1, max_length=20000)
    audience: str = "council"
    ward_id: int | None = None
    category_id: int | None = None


class AnnouncementPatch(BaseModel):
    title: str | None = None
    body_markdown: str | None = None
    audience: str | None = None
    ward_id: int | None = None
    category_id: int | None = None


class AuditEventOut(BaseModel):
    id: int
    actor_user_id: int | None
    actor_name: str | None
    action: str
    target_type: str | None
    target_id: str | None
    ip_address: str | None
    created_at: datetime
