from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: int
    key: str
    label: str
    icon: str | None
    sla_hours: int
    requires_photo: bool


class ReportCreate(BaseModel):
    category_id: int
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=4000)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    address_text: str | None = Field(default=None, max_length=300)
    custom_fields: dict[str, Any] | None = None
    attachment_keys: list[str] = Field(default_factory=list, max_length=10)


class ReportListItem(BaseModel):
    id: int
    title: str
    status: str
    priority: str
    category_id: int
    category_label: str
    created_at: datetime
    sla_due_at: datetime | None
    assignee_name: str | None = None


class AttachmentOut(BaseModel):
    id: int
    kind: str
    r2_key: str
    mime: str | None
    created_at: datetime


class EventOut(BaseModel):
    id: int
    kind: str
    actor_user_id: int | None
    actor_name: str | None
    body: str | None
    internal: bool
    event_metadata: dict[str, Any] | None = Field(default=None, alias="metadata")
    created_at: datetime

    model_config = {"populate_by_name": True}


class ReportDetail(BaseModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    category_id: int
    category_label: str
    reporter_user_id: int
    reporter_name: str | None
    assignee_user_id: int | None
    assignee_name: str | None
    team_id: int | None
    team_name: str | None
    lat: float | None
    lng: float | None
    address_text: str | None
    created_at: datetime
    sla_due_at: datetime | None
    resolved_at: datetime | None
    attachments: list[AttachmentOut]
    custom_fields: dict[str, Any] | None


# --- Event payloads ---


class ResidentEventIn(BaseModel):
    """Residents can only post messages."""

    kind: Literal["message"] = "message"
    body: str = Field(min_length=1, max_length=4000)


class StaffEventIn(BaseModel):
    """Staff can post messages or structured events. metadata varies by kind."""

    kind: Literal[
        "message",
        "status_change",
        "assignment",
        "priority_change",
        "file_request",
    ]
    body: str | None = Field(default=None, max_length=4000)
    internal: bool = False
    event_metadata: dict[str, Any] | None = Field(default=None, alias="metadata")

    model_config = {"populate_by_name": True}


class ReportPatchIn(BaseModel):
    status: str | None = None
    priority: str | None = None
    assignee_user_id: int | None = None
    team_id: int | None = None


# --- Staff filters ---


class StaffListFilters(BaseModel):
    status: str | None = None
    category_id: int | None = None
    assignee_user_id: int | None = None
    team_id: int | None = None
    mine: bool = False
    sla_at_risk: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class QueueSummary(BaseModel):
    total_open: int
    by_status: dict[str, int]
    by_team: dict[str, int]
    sla_breached: int
    sla_at_risk: int
    mine: int
