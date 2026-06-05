"""Rates / property domain.

Port-forward of the legacy schema (cents-based money, instalment plans,
concessions, valuations, overlays, waste entitlements, council deep-links).
Green-field deploy — no row migration.

GeoJSON columns are portable JSON; PostGIS spatial indexes can be added
later via a migration that promotes (lat, lng) to a generated geography
column in Postgres only.
"""
from __future__ import annotations

import enum
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
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


class PropertyType(enum.StrEnum):
    primary = "primary"
    investment = "investment"
    commercial = "commercial"


class Property(Base):
    __tablename__ = "property"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    suburb: Mapped[str | None] = mapped_column(String(120))
    postcode: Mapped[str | None] = mapped_column(String(8))
    property_type: Mapped[str] = mapped_column(String(16), default=PropertyType.primary.value, nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    parcel_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    land_size_sqm: Mapped[int | None] = mapped_column(Integer)
    zone: Mapped[str | None] = mapped_column(String(32))
    waste_route_id: Mapped[int | None] = mapped_column(
        ForeignKey("waste_collection.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    ownerships: Mapped[list[PropertyOwnership]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    account: Mapped[RatesAccount | None] = relationship(
        back_populates="property", uselist=False, cascade="all, delete-orphan"
    )
    valuations: Mapped[list[Valuation]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    rate_charges: Mapped[list[RateCharge]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    concessions: Mapped[list[Concession]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    overlays: Mapped[list[PropertyOverlay]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    waste_entitlement: Mapped[WasteEntitlement | None] = relationship(
        back_populates="property", uselist=False, cascade="all, delete-orphan"
    )
    billing_setting: Mapped[BillingSetting | None] = relationship(
        back_populates="property", uselist=False, cascade="all, delete-orphan"
    )


class PropertyOwnership(Base):
    __tablename__ = "property_ownership"
    __table_args__ = (
        UniqueConstraint("property_id", "user_id", name="uq_property_ownership"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), default="owner", nullable=False)  # owner|tenant
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    property: Mapped[Property] = relationship(back_populates="ownerships")


class RatesAccount(Base):
    __tablename__ = "rates_account"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    account_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_due_date: Mapped[date | None] = mapped_column(Date)
    ebilling_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    direct_debit: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    property: Mapped[Property] = relationship(back_populates="account")
    invoices: Mapped[list[RatesInvoice]] = relationship(
        back_populates="account", cascade="all, delete-orphan", order_by="RatesInvoice.issue_date.desc()"
    )


class InvoiceStatus(enum.StrEnum):
    issued = "issued"
    paid = "paid"
    partial = "partial"
    overdue = "overdue"
    cancelled = "cancelled"


class RatesInvoice(Base):
    __tablename__ = "rates_invoice"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    invoice_number: Mapped[str] = mapped_column(String(32), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default=InvoiceStatus.issued.value, nullable=False)
    line_items: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    pdf_r2_key: Mapped[str | None] = mapped_column(String(500))

    account: Mapped[RatesAccount] = relationship(back_populates="invoices")


class Valuation(Base):
    __tablename__ = "valuation"
    __table_args__ = (UniqueConstraint("property_id", "year", name="uq_valuation_property_year"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    land_value_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    capital_value_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    property: Mapped[Property] = relationship(back_populates="valuations")


class RateCharge(Base):
    __tablename__ = "rate_charge"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)  # general_rate|waste|stormwater|levy
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)

    property: Mapped[Property] = relationship(back_populates="rate_charges")


class Concession(Base):
    __tablename__ = "concession"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)  # pensioner|hardship|other
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    annual_value_cents: Mapped[int | None] = mapped_column(Integer)
    link_apply: Mapped[str | None] = mapped_column(String(500))

    property: Mapped[Property] = relationship(back_populates="concessions")


class PropertyOverlay(Base):
    __tablename__ = "property_overlay"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # flood|bushfire|heritage|noise|other
    source: Mapped[str | None] = mapped_column(String(120))
    note: Mapped[str | None] = mapped_column(Text)

    property: Mapped[Property] = relationship(back_populates="overlays")


class WasteEntitlement(Base):
    __tablename__ = "waste_entitlement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    bin_size_l: Mapped[int | None] = mapped_column(Integer)
    extra_bins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    collection_day: Mapped[str | None] = mapped_column(String(16))  # Mon..Sun
    notes: Mapped[str | None] = mapped_column(Text)

    property: Mapped[Property] = relationship(back_populates="waste_entitlement")


class BillingSetting(Base):
    __tablename__ = "billing_setting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    direct_debit_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ebill_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    update_payment_link: Mapped[str | None] = mapped_column(String(500))

    property: Mapped[Property] = relationship(back_populates="billing_setting")


class BpayCrn(Base):
    """Customer Reference Number per rates account, scoped per council biller."""

    __tablename__ = "bpay_crn"
    __table_args__ = (
        UniqueConstraint("council_id", "crn", name="uq_bpay_crn_council"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    crn: Mapped[str] = mapped_column(String(20), nullable=False)
    biller_code: Mapped[str] = mapped_column(String(16), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
