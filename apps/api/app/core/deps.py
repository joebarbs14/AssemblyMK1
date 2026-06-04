from __future__ import annotations

import logging
from collections.abc import Callable

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import decode_access_token
from app.core.tenancy import slug_from_request
from app.models import Council, User, UserRole

_log = logging.getLogger(__name__)


def get_current_council(
    request: Request,
    db: Session = Depends(get_db),
) -> Council:
    slug = slug_from_request(request)
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No council resolved. Set X-Council-Slug or use a tenant subdomain.",
        )
    council = db.query(Council).filter(Council.slug == slug).one_or_none()
    if council is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown council: {slug}")
    return council


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        claims = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = int(claims["sub"])
    user = db.get(User, user_id)
    if user is None or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active")
    return user


def require_role(*allowed: UserRole) -> Callable[[User], User]:
    allowed_values = {r.value for r in allowed}

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_values:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return _checker
