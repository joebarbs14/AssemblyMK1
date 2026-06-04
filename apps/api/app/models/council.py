from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Council(Base):
    __tablename__ = "council"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    shire_name: Mapped[str | None] = mapped_column(String(200))
    timezone: Mapped[str] = mapped_column(String(64), default="Australia/Sydney", nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    brand_color: Mapped[str] = mapped_column(String(16), default="#0B3D2E", nullable=False)
    lga_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    bpay_biller_code: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    wards: Mapped[list[Ward]] = relationship(back_populates="council", cascade="all, delete-orphan")


class Ward(Base):
    __tablename__ = "ward"
    __table_args__ = (UniqueConstraint("council_id", "code", name="uq_ward_council_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    boundary_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    council: Mapped[Council] = relationship(back_populates="wards")
