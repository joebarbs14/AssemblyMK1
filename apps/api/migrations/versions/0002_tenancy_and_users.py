"""tenancy, users, sso

Revision ID: 0002_tenancy_and_users
Revises: 0001_baseline
Create Date: 2026-06-02 13:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_tenancy_and_users"
down_revision: str | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "council",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("shire_name", sa.String(200)),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="Australia/Sydney"),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("brand_color", sa.String(16), nullable=False, server_default="#0B3D2E"),
        sa.Column("lga_geojson", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("bpay_biller_code", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_council_slug", "council", ["slug"], unique=True)

    op.create_table(
        "ward",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("boundary_geojson", postgresql.JSONB(astext_type=sa.Text())),
        sa.UniqueConstraint("council_id", "code", name="uq_ward_council_code"),
    )

    op.create_table(
        "user_account",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("email", sa.String(254), nullable=False, index=True),
        sa.Column("name", sa.String(120)),
        sa.Column("phone", sa.String(32)),
        sa.Column("password_hash", sa.String(255)),
        sa.Column("role", sa.String(16), nullable=False, server_default="resident"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("mfa_totp_secret", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("council_id", "email", name="uq_user_council_email"),
        sa.CheckConstraint("role IN ('resident', 'staff', 'admin')", name="ck_user_role"),
        sa.CheckConstraint("status IN ('invited', 'active', 'disabled')", name="ck_user_status"),
    )

    op.create_table(
        "sso_identity",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("email", sa.String(254)),
        sa.Column("raw_claims", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("provider", "subject", name="uq_sso_provider_subject"),
    )

    op.create_table(
        "tenant_sso_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("issuer_or_tenant", sa.String(255)),
        sa.Column("client_id", sa.String(255), nullable=False),
        sa.Column("client_secret_encrypted", sa.String(2048), nullable=False),
        sa.Column("allowed_email_domains", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("council_id", "provider", name="uq_tenant_sso_provider"),
    )

    op.create_table(
        "magic_link_use",
        sa.Column("jti", sa.String(43), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("magic_link_use")
    op.drop_table("tenant_sso_config")
    op.drop_table("sso_identity")
    op.drop_table("user_account")
    op.drop_table("ward")
    op.drop_index("ix_council_slug", table_name="council")
    op.drop_table("council")
