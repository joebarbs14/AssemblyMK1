"""WS-FO-206 flow rate test applications

Revision ID: 0024_flow_rate_application
Revises: 0023_water_ext
Create Date: 2026-06-07 12:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024_flow_rate_application"
down_revision: str | None = "0023_water_ext"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "water_flow_rate_application",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="SET NULL"),
                  nullable=True, index=True),
        sa.Column("reference", sa.String(24), nullable=False, unique=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="submitted"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.func.now()),

        # Section 68 link
        sa.Column("is_section_68", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("section_68_ref", sa.String(64)),
        sa.Column("cdc_da_ref", sa.String(64)),

        # Applicant
        sa.Column("applicant_name", sa.String(160), nullable=False),
        sa.Column("applicant_postal_address", sa.String(300), nullable=False),
        sa.Column("company_name", sa.String(160)),
        sa.Column("contact_phone", sa.String(32), nullable=False),
        sa.Column("contact_email", sa.String(254), nullable=False),

        # Hydrants + test type
        sa.Column("hydrant_asset_id_primary", sa.String(32)),
        sa.Column("hydrant_asset_id_secondary", sa.String(32)),
        sa.Column("test_type", sa.String(8), nullable=False, server_default="single"),

        # Property
        sa.Column("street_address", sa.String(300), nullable=False),
        sa.Column("lot", sa.String(32)),
        sa.Column("dp", sa.String(32)),
        sa.Column("assessment_no", sa.String(32)),
        sa.Column("parcel", sa.String(64)),
        sa.Column("property_description", sa.String(300)),
        sa.Column("building_over_25m", sa.Boolean(), nullable=False, server_default=sa.false()),

        # Purpose of test
        sa.Column("purpose_fire_service", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("purpose_town_supply", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("purpose_mains_extension", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("purpose_other", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("purpose_other_text", sa.String(300)),
        sa.Column("new_street_hydrant", sa.Boolean(), nullable=False, server_default=sa.false()),

        # Fire-service breakdown
        sa.Column("internal_hydrants", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("internal_hydrants_count", sa.Integer()),
        sa.Column("hose_reels", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("hose_reels_count", sa.Integer()),
        sa.Column("sprinklers", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sprinklers_count", sa.Integer()),

        # Signature + plan
        sa.Column("signed_name", sa.String(160), nullable=False),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("site_plan_url", sa.String(500)),
        sa.Column("notes", sa.Text()),
    )


def downgrade() -> None:
    op.drop_table("water_flow_rate_application")
