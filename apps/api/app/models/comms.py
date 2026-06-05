from __future__ import annotations

import enum
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AnnouncementStatus(enum.StrEnum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"
    archived = "archived"


class AnnouncementAudience(enum.StrEnum):
    council = "council"
    ward = "ward"
    category = "category"


class Announcement(Base):
    __tablename__ = "announcement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    author_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    hero_image_r2_key: Mapped[str | None] = mapped_column(String(500))

    audience: Mapped[str] = mapped_column(String(16), default=AnnouncementAudience.council.value, nullable=False)
    ward_id: Mapped[int | None] = mapped_column(ForeignKey("ward.id", ondelete="SET NULL"))
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("report_category.id", ondelete="SET NULL")
    )

    status: Mapped[str] = mapped_column(
        String(16), default=AnnouncementStatus.draft.value, nullable=False, index=True
    )
    publish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class AuditEvent(Base):
    """Append-only audit log for state-changing API calls."""

    __tablename__ = "audit_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int | None] = mapped_column(
        ForeignKey("council.id", ondelete="SET NULL"), index=True
    )
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_type: Mapped[str | None] = mapped_column(String(64))
    target_id: Mapped[str | None] = mapped_column(String(64))
    event_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
