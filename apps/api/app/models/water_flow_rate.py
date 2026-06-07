"""WS-FO-206 — Application for a Flow Rate Test.

A resident lodges this so council Water Operations can schedule a
hydrant flow + pressure test. The form mirrors the paper original 1:1
(applicant details, property, purpose, fire-service breakdown,
signature, optional site plan) but every field is structured so the
ops queue can sort by status, the hydraulic-calc flag fires when fire
service is selected, and a follow-up e-mail can quote a stable
reference.
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


class WaterFlowRateApplication(Base):
    __tablename__ = "water_flow_rate_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    reference: Mapped[str] = mapped_column(String(24), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(16), default="submitted", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    is_section_68: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    section_68_ref: Mapped[str | None] = mapped_column(String(64))
    cdc_da_ref: Mapped[str | None] = mapped_column(String(64))

    applicant_name: Mapped[str] = mapped_column(String(160), nullable=False)
    applicant_postal_address: Mapped[str] = mapped_column(String(300), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(160))
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(254), nullable=False)

    hydrant_asset_id_primary: Mapped[str | None] = mapped_column(String(32))
    hydrant_asset_id_secondary: Mapped[str | None] = mapped_column(String(32))
    test_type: Mapped[str] = mapped_column(String(8), default="single", nullable=False)

    street_address: Mapped[str] = mapped_column(String(300), nullable=False)
    lot: Mapped[str | None] = mapped_column(String(32))
    dp: Mapped[str | None] = mapped_column(String(32))
    assessment_no: Mapped[str | None] = mapped_column(String(32))
    parcel: Mapped[str | None] = mapped_column(String(64))
    property_description: Mapped[str | None] = mapped_column(String(300))
    building_over_25m: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    purpose_fire_service: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purpose_town_supply: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purpose_mains_extension: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purpose_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purpose_other_text: Mapped[str | None] = mapped_column(String(300))
    new_street_hydrant: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    internal_hydrants: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    internal_hydrants_count: Mapped[int | None] = mapped_column(Integer)
    hose_reels: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hose_reels_count: Mapped[int | None] = mapped_column(Integer)
    sprinklers: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sprinklers_count: Mapped[int | None] = mapped_column(Integer)

    signed_name: Mapped[str] = mapped_column(String(160), nullable=False)
    signed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    site_plan_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
