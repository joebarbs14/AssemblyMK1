from __future__ import annotations

import enum
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class ReportStatus(enum.StrEnum):
    new = "new"
    triaging = "triaging"
    assigned = "assigned"
    in_progress = "in_progress"
    awaiting_resident = "awaiting_resident"
    resolved = "resolved"
    closed = "closed"
    duplicate = "duplicate"
    rejected = "rejected"


class ReportPriority(enum.StrEnum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class ReportEventKind(enum.StrEnum):
    message = "message"
    status_change = "status_change"
    assignment = "assignment"
    priority_change = "priority_change"
    attachment_added = "attachment_added"
    file_request = "file_request"
    appointment_proposed = "appointment_proposed"
    appointment_confirmed = "appointment_confirmed"
    appointment_cancelled = "appointment_cancelled"
    appointment_completed = "appointment_completed"
    signature_requested = "signature_requested"
    signature_provided = "signature_provided"


class ReportCategory(Base):
    __tablename__ = "report_category"
    __table_args__ = (UniqueConstraint("council_id", "key", name="uq_category_council_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(32))
    sla_hours: Mapped[int] = mapped_column(Integer, default=72, nullable=False)
    default_team_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_team.id", ondelete="SET NULL"), nullable=True
    )
    requires_photo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    custom_fields_schema: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Report(Base):
    __tablename__ = "report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    ward_id: Mapped[int | None] = mapped_column(ForeignKey("ward.id", ondelete="SET NULL"))
    category_id: Mapped[int] = mapped_column(
        ForeignKey("report_category.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    reporter_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Geo — float lat/lng is portable; PostGIS Geography promotion lands in M3.2 when we
    # need spatial indexes for the staff map cluster view.
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    address_text: Mapped[str | None] = mapped_column(String(300))

    status: Mapped[str] = mapped_column(
        String(24), default=ReportStatus.new.value, nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(16), default=ReportPriority.normal.value, nullable=False
    )
    assignee_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_team.id", ondelete="SET NULL"), index=True
    )

    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    custom_fields: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    attachments: Mapped[list[ReportAttachment]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="ReportAttachment.id"
    )
    events: Mapped[list[ReportEvent]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="ReportEvent.id"
    )


class ReportAttachment(Base):
    __tablename__ = "report_attachment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(16), default="photo", nullable=False)  # photo|video|doc|signature
    r2_key: Mapped[str] = mapped_column(String(500), nullable=False)
    mime: Mapped[str | None] = mapped_column(String(120))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    exif: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    uploaded_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    in_response_to_event_id: Mapped[int | None] = mapped_column(
        ForeignKey("report_event.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    report: Mapped[Report] = relationship(back_populates="attachments")


class ReportEvent(Base):
    """Unified timeline row. See REBUILD_PLAN.md §C and DESIGN.md Shared Workspace."""

    __tablename__ = "report_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), index=True, nullable=False
    )
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )  # nullable for system events
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    body: Mapped[str | None] = mapped_column(Text)
    internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    event_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )

    report: Mapped[Report] = relationship(back_populates="events")


class ReportSubscription(Base):
    __tablename__ = "report_subscription"
    __table_args__ = (UniqueConstraint("report_id", "user_id", name="uq_subscription"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
