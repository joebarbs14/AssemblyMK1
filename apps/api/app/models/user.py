from __future__ import annotations

import enum
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.council import Council


class UserRole(enum.StrEnum):
    resident = "resident"
    staff = "staff"
    admin = "admin"


class UserStatus(enum.StrEnum):
    invited = "invited"
    active = "active"
    disabled = "disabled"


class User(Base):
    __tablename__ = "user_account"  # "user" is reserved in Postgres
    __table_args__ = (
        UniqueConstraint("council_id", "email", name="uq_user_council_email"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(ForeignKey("council.id", ondelete="RESTRICT"), index=True, nullable=False)

    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(32))

    password_hash: Mapped[str | None] = mapped_column(String(255))  # nullable for SSO-only users
    role: Mapped[str] = mapped_column(String(16), default=UserRole.resident.value, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default=UserStatus.active.value, nullable=False)

    mfa_totp_secret: Mapped[str | None] = mapped_column(String(64))  # M2.x

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    council: Mapped[Council] = relationship()
    sso_identities: Mapped[list[SsoIdentity]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class SsoIdentity(Base):
    """One row per IdP linkage for a user (Microsoft Entra, Google, etc.)."""

    __tablename__ = "sso_identity"
    __table_args__ = (
        UniqueConstraint("provider", "subject", name="uq_sso_provider_subject"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # microsoft | google
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254))
    raw_claims: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="sso_identities")


class TenantSsoConfig(Base):
    """Per-council OIDC config. client_secret stored encrypted in M8."""

    __tablename__ = "tenant_sso_config"
    __table_args__ = (
        UniqueConstraint("council_id", "provider", name="uq_tenant_sso_provider"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # microsoft | google
    issuer_or_tenant: Mapped[str | None] = mapped_column(String(255))  # Entra tenant id / Google "workspace"
    client_id: Mapped[str] = mapped_column(String(255), nullable=False)
    client_secret_encrypted: Mapped[str] = mapped_column(String(2048), nullable=False)
    allowed_email_domains: Mapped[list[str] | None] = mapped_column(JSON)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
