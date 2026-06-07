"""Section 68 (NSW Local Government Act 1993) applications.

A Section 68 application is the parent record for council approval to
carry out one of the activities listed in Parts A–F of the Act. The
applicant nominates an activity class + subtype + property; council
staff review and approve / reject.

Sub-forms (e.g. WS-FO-206 flow rate test) attach to a S68 application
via their own `section_68_application_id` foreign key so the parent can
roll-up "what's outstanding" for the resident.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Section68Application(Base):
    __tablename__ = "section_68_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    reference: Mapped[str] = mapped_column(String(24), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Activity classification (Parts A–F of s68)
    activity_class: Mapped[str] = mapped_column(String(1), nullable=False)
    activity_subtype: Mapped[str] = mapped_column(String(64), nullable=False)
    is_new_build: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    linked_cdc_da_ref: Mapped[str | None] = mapped_column(String(64))

    # Property
    street_address: Mapped[str] = mapped_column(String(300), nullable=False)
    lot: Mapped[str | None] = mapped_column(String(32))
    dp: Mapped[str | None] = mapped_column(String(32))
    assessment_no: Mapped[str | None] = mapped_column(String(32))
    parcel: Mapped[str | None] = mapped_column(String(64))

    # Applicant
    applicant_name: Mapped[str] = mapped_column(String(160), nullable=False)
    applicant_postal_address: Mapped[str] = mapped_column(String(300), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(254), nullable=False)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
