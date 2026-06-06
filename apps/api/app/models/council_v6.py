"""V6 council features: surveys & polls, petitions, DA submissions,
FOI/GIPA, tenders & contracts, jobs board, AI FAQ, climate rebates,
community gardens, inspector workflow."""
from __future__ import annotations

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
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# --- #1 Surveys & polls ---


class Survey(Base):
    __tablename__ = "survey"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # poll|nps|consultation
    audience: Mapped[str] = mapped_column(String(16), default="public", nullable=False)
    opens_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)


class SurveyQuestion(Base):
    __tablename__ = "survey_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    survey_id: Mapped[int] = mapped_column(
        ForeignKey("survey.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # single|multi|scale|short_text|long_text
    options: Mapped[list[str] | None] = mapped_column(JSON)
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SurveyResponse(Base):
    __tablename__ = "survey_response"
    __table_args__ = (UniqueConstraint("survey_id", "user_id", name="uq_survey_response"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    survey_id: Mapped[int] = mapped_column(
        ForeignKey("survey.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    answers: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #2 Petitions ---


class Petition(Base):
    __tablename__ = "petition"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    author_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    ask: Mapped[str] = mapped_column(Text, nullable=False)  # the specific request
    threshold: Mapped[int] = mapped_column(Integer, default=250, nullable=False)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)  # open|review|responded|closed
    council_response: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class PetitionSignature(Base):
    __tablename__ = "petition_signature"
    __table_args__ = (UniqueConstraint("petition_id", "user_id", name="uq_petition_signature"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    petition_id: Mapped[int] = mapped_column(
        ForeignKey("petition.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    comment: Mapped[str | None] = mapped_column(Text)
    signed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #3 DA public submissions ---


class DaSubmission(Base):
    __tablename__ = "da_submission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    da_id: Mapped[int] = mapped_column(
        ForeignKey("development_application.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stance: Mapped[str] = mapped_column(String(16), nullable=False)  # support|object|neutral
    body: Mapped[str] = mapped_column(Text, nullable=False)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- #4 FOI / GIPA ---


class InfoRequest(Base):
    __tablename__ = "info_request"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), default="formal", nullable=False)  # formal|informal
    status: Mapped[str] = mapped_column(String(16), default="received", nullable=False, index=True)
    # received|assessing|fees_quoted|decided|released|refused|withdrawn
    decision: Mapped[str | None] = mapped_column(String(16))
    fees_cents: Mapped[int | None] = mapped_column(Integer)
    due_by: Mapped[date] = mapped_column(Date, nullable=False)  # GIPA: 20 working days
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #5 Tenders & contracts ---


class Tender(Base):
    __tablename__ = "tender"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)  # construction|services|supplies|consulting
    estimated_value_cents: Mapped[int | None] = mapped_column(Integer)
    opens_at: Mapped[date] = mapped_column(Date, nullable=False)
    closes_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)  # open|closed|awarded
    documents_url: Mapped[str | None] = mapped_column(String(500))


class ContractAward(Base):
    __tablename__ = "contract_award"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tender_id: Mapped[int | None] = mapped_column(
        ForeignKey("tender.id", ondelete="SET NULL")
    )
    contract_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    supplier_abn: Mapped[str | None] = mapped_column(String(20))
    value_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    local_supplier: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text)


# --- #6 Jobs board ---


class JobListing(Base):
    __tablename__ = "job_listing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    employer: Mapped[str] = mapped_column(String(200), nullable=False)
    is_council: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # full_time|part_time|casual|contract|work_experience|grad
    salary_min_cents: Mapped[int | None] = mapped_column(Integer)
    salary_max_cents: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    apply_url: Mapped[str | None] = mapped_column(String(500))
    posted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    closes_at: Mapped[date | None] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)


# --- #7 AI FAQ chatbot ---


class KbArticle(Base):
    """Curated knowledge base articles used as retrieval context."""
    __tablename__ = "kb_article"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)  # waste|rates|pets|permits|water|other
    source_url: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC), nullable=False,
    )


class ChatMessage(Base):
    __tablename__ = "chat_message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    session_id: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user|assistant|system
    text: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list[int] | None] = mapped_column(JSON)  # KbArticle ids
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #8 Climate / rebate finder ---


class RebateScheme(Base):
    __tablename__ = "rebate_scheme"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int | None] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True
    )  # null = federal/state, shown to all
    level: Mapped[str] = mapped_column(String(16), nullable=False)  # federal|state|council
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # solar|battery|ev|insulation|water_tank|e_bike|heat_pump
    max_amount_cents: Mapped[int | None] = mapped_column(Integer)
    eligibility: Mapped[str] = mapped_column(Text, nullable=False)
    apply_url: Mapped[str | None] = mapped_column(String(500))
    expires_on: Mapped[date | None] = mapped_column(Date, index=True)


# --- #9 Community gardens ---


class GardenPlot(Base):
    __tablename__ = "garden_plot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    garden_name: Mapped[str] = mapped_column(String(200), nullable=False)
    plot_code: Mapped[str] = mapped_column(String(20), nullable=False)
    size_sqm: Mapped[float] = mapped_column(Float, nullable=False)
    annual_fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="available", nullable=False, index=True)
    # available|assigned|maintenance


class PlotAssignment(Base):
    __tablename__ = "plot_assignment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plot_id: Mapped[int] = mapped_column(
        ForeignKey("garden_plot.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="waitlisted", nullable=False)  # waitlisted|active|ended
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --- #10 Inspector mobile workflow ---


class InspectionTemplate(Base):
    __tablename__ = "inspection_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # building|plumbing|food|environmental|pool_safety
    checklist: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # [{"id":"slab_level","prompt":"Slab levelled?","kind":"yes_no|note|photo"}]
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class InspectionRecord(Base):
    __tablename__ = "inspection_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    template_id: Mapped[int] = mapped_column(
        ForeignKey("inspection_template.id", ondelete="CASCADE"), index=True, nullable=False
    )
    officer_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_kind: Mapped[str] = mapped_column(String(32), nullable=False)  # da|food_premises|asset|address
    target_id: Mapped[int | None] = mapped_column(Integer)
    target_address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    answers: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)  # pass|conditional|fail
    notes: Mapped[str | None] = mapped_column(Text)
    photos: Mapped[list[str] | None] = mapped_column(JSON)  # r2 keys
    inspected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
