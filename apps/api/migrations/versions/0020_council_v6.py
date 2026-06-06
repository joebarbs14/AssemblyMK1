"""v6 council features

Revision ID: 0020_council_v6
Revises: 0019_council_v5
Create Date: 2026-06-06 05:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0020_council_v6"
down_revision: str | None = "0019_council_v5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "survey",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("audience", sa.String(16), nullable=False, server_default="public"),
        sa.Column("opens_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("closes_at", sa.DateTime(timezone=True), index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
    )
    op.create_table(
        "survey_question",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("survey_id", sa.Integer(), sa.ForeignKey("survey.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("options", _jsonb()),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "survey_response",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("survey_id", sa.Integer(), sa.ForeignKey("survey.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("answers", _jsonb(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("survey_id", "user_id", name="uq_survey_response"),
    )
    op.create_table(
        "petition",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("ask", sa.Text(), nullable=False),
        sa.Column("threshold", sa.Integer(), nullable=False, server_default="250"),
        sa.Column("closes_at", sa.DateTime(timezone=True), index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("council_response", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "petition_signature",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("petition_id", sa.Integer(), sa.ForeignKey("petition.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("comment", sa.Text()),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("petition_id", "user_id", name="uq_petition_signature"),
    )
    op.create_table(
        "da_submission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("da_id", sa.Integer(), sa.ForeignKey("development_application.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("stance", sa.String(16), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("anonymous", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )
    op.create_table(
        "info_request",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reference", sa.String(40), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False, server_default="formal"),
        sa.Column("status", sa.String(16), nullable=False, server_default="received", index=True),
        sa.Column("decision", sa.String(16)),
        sa.Column("fees_cents", sa.Integer()),
        sa.Column("due_by", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "tender",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reference", sa.String(40), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("estimated_value_cents", sa.Integer()),
        sa.Column("opens_at", sa.Date(), nullable=False),
        sa.Column("closes_at", sa.Date(), nullable=False, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("documents_url", sa.String(500)),
    )
    op.create_table(
        "contract_award",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tender_id", sa.Integer(), sa.ForeignKey("tender.id", ondelete="SET NULL")),
        sa.Column("contract_no", sa.String(40), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("supplier_name", sa.String(200), nullable=False),
        sa.Column("supplier_abn", sa.String(20)),
        sa.Column("value_cents", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False, index=True),
        sa.Column("local_supplier", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True),
        sa.Column("summary", sa.Text()),
    )
    op.create_table(
        "job_listing",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("employer", sa.String(200), nullable=False),
        sa.Column("is_council", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("salary_min_cents", sa.Integer()),
        sa.Column("salary_max_cents", sa.Integer()),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(200)),
        sa.Column("apply_url", sa.String(500)),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
        sa.Column("closes_at", sa.Date(), index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
    )
    op.create_table(
        "kb_article",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False, index=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("source_url", sa.String(500)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "chat_message",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("session_id", sa.String(40), nullable=False, index=True),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("citations", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "rebate_scheme",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), index=True),
        sa.Column("level", sa.String(16), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, index=True),
        sa.Column("max_amount_cents", sa.Integer()),
        sa.Column("eligibility", sa.Text(), nullable=False),
        sa.Column("apply_url", sa.String(500)),
        sa.Column("expires_on", sa.Date(), index=True),
    )
    op.create_table(
        "garden_plot",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("garden_name", sa.String(200), nullable=False),
        sa.Column("plot_code", sa.String(20), nullable=False),
        sa.Column("size_sqm", sa.Float(), nullable=False),
        sa.Column("annual_fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("notes", sa.Text()),
        sa.Column("status", sa.String(16), nullable=False, server_default="available", index=True),
    )
    op.create_table(
        "plot_assignment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plot_id", sa.Integer(), sa.ForeignKey("garden_plot.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="waitlisted"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "inspection_template",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("checklist", _jsonb(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "inspection_record",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("inspection_template.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("officer_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("target_kind", sa.String(32), nullable=False),
        sa.Column("target_id", sa.Integer()),
        sa.Column("target_address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("answers", _jsonb(), nullable=False),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("photos", _jsonb()),
        sa.Column("inspected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )


def downgrade() -> None:
    for t in [
        "inspection_record", "inspection_template",
        "plot_assignment", "garden_plot",
        "rebate_scheme",
        "chat_message", "kb_article",
        "job_listing",
        "contract_award", "tender",
        "info_request",
        "da_submission",
        "petition_signature", "petition",
        "survey_response", "survey_question", "survey",
    ]:
        op.drop_table(t)
