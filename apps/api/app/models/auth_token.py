from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class MagicLinkUse(Base):
    """Tracks single-use of a magic-link token (jti) to prevent replay.

    The link itself is a signed payload (itsdangerous); this table just
    records which jtis have been consumed.
    """

    __tablename__ = "magic_link_use"

    jti: Mapped[str] = mapped_column(String(43), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False)
    used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
