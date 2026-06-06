"""Rates strike configuration — per-council, per-FY rate categories.

NSW formula (common): annual_rate = max(minimum, base + UV × ad_valorem_per_dollar)
Where UV = Unimproved Value (a.k.a. Land Value) sourced from Valuer General.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class RateCategory(Base):
    """One rate category struck by council for a fiscal year.

    e.g. (council=Leeton, FY=2025, code=residential, ad_valorem=0.003421,
          minimum=$735, base=$0)
    """
    __tablename__ = "rate_category"
    __table_args__ = (
        UniqueConstraint("council_id", "fiscal_year", "code", name="uq_rate_category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    # residential|business|farmland|mining|primary_production|sub_residential|sub_business
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    # Rate in the dollar of UV, e.g. 0.003421 (= 0.3421 cents per $1)
    ad_valorem_cents_per_dollar: Mapped[float] = mapped_column(Float, nullable=False)
    base_amount_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    minimum_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
