"""section 68 applications + link to existing water flow-rate application

Revision ID: 0025_section_68
Revises: 0024_flow_rate_application
Create Date: 2026-06-07 14:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0025_section_68"
down_revision: str | None = "0024_flow_rate_application"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "section_68_application",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="SET NULL"),
                  nullable=True, index=True),
        sa.Column("reference", sa.String(24), nullable=False, unique=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),

        # Activity classification (LG Act 1993 s68 Parts A–F)
        sa.Column("activity_class", sa.String(1), nullable=False),
        sa.Column("activity_subtype", sa.String(64), nullable=False),
        sa.Column("is_new_build", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("linked_cdc_da_ref", sa.String(64)),

        # Property
        sa.Column("street_address", sa.String(300), nullable=False),
        sa.Column("lot", sa.String(32)),
        sa.Column("dp", sa.String(32)),
        sa.Column("assessment_no", sa.String(32)),
        sa.Column("parcel", sa.String(64)),

        # Applicant
        sa.Column("applicant_name", sa.String(160), nullable=False),
        sa.Column("applicant_postal_address", sa.String(300), nullable=False),
        sa.Column("contact_phone", sa.String(32), nullable=False),
        sa.Column("contact_email", sa.String(254), nullable=False),

        # Description + notes
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text()),
    )

    # Link existing flow-rate applications to a parent S68 record.
    op.add_column(
        "water_flow_rate_application",
        sa.Column("section_68_application_id", sa.Integer(),
                  sa.ForeignKey("section_68_application.id", ondelete="SET NULL"),
                  nullable=True, index=True),
    )


def downgrade() -> None:
    op.drop_column("water_flow_rate_application", "section_68_application_id")
    op.drop_table("section_68_application")
