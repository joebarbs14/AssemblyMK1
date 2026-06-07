from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_council, get_current_user
from app.core.email import send_magic_link
from app.core.rate_limit import limiter
from app.core.security import (
    consume_magic_link_token,
    hash_password,
    issue_access_token,
    issue_magic_link_token,
    verify_password,
)
from app.models import Council, MagicLinkUse, User, UserRole, UserStatus
from app.schemas.auth import (
    CouncilOut,
    MagicLinkRequestIn,
    MagicLinkVerifyIn,
    MeOut,
    PasswordLoginIn,
    RegisterIn,
    TokenOut,
)

_log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _issue_token_for(user: User) -> TokenOut:
    token = issue_access_token(subject=str(user.id), council_id=user.council_id, role=user.role)
    return TokenOut(access_token=token, expires_in=settings.jwt_access_ttl_seconds)


def _find_user(db: Session, council_id: int, email: str) -> User | None:
    return (
        db.query(User)
        .filter(User.council_id == council_id, func.lower(User.email) == email)
        .one_or_none()
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(
    request: Request,
    body: RegisterIn,
    council: Council = Depends(get_current_council),
    db: Session = Depends(get_db),
) -> TokenOut:
    email = _normalize_email(body.email)
    if _find_user(db, council.id, email) is not None:
        # Don't reveal existence; 409 is fine here since the user is on a self-signup form.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        council_id=council.id,
        email=email,
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        role=UserRole.resident.value,
        status=UserStatus.active.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return _issue_token_for(user)


@router.post("/password/login", response_model=TokenOut)
@limiter.limit("5/minute")
def password_login(
    request: Request,
    body: PasswordLoginIn,
    council: Council = Depends(get_current_council),
    db: Session = Depends(get_db),
) -> TokenOut:
    user = _find_user(db, council.id, _normalize_email(body.email))
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        # Constant-ish response; don't leak which side failed.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.status != UserStatus.active.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not active")
    if user.role != UserRole.resident.value:
        # Staff/admin must use SSO once it's wired (M2.x). For now allow password as well
        # so the rebuild stays usable until SSO is live; flip this to 403 in M2.x.
        _log.info("Non-resident password login by user_id=%s role=%s", user.id, user.role)

    user.last_login_at = datetime.now(UTC)
    db.commit()
    return _issue_token_for(user)


@router.post("/portal-login", response_model=TokenOut)
@limiter.limit("5/minute")
def portal_login(
    request: Request,
    body: PasswordLoginIn,
    council: Council = Depends(get_current_council),
    db: Session = Depends(get_db),
) -> TokenOut:
    """Staff-portal login. Rejects residents at the credential check so
    they can't grant themselves access by URL-guessing.

    Allows the same email + password the user already has — councils that
    want truly separate credentials should invite staff with a council-
    domain email via /admin/users (which won't collide with any personal
    resident account on a different email).
    """
    user = _find_user(db, council.id, _normalize_email(body.email))
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.status != UserStatus.active.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not active")
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        # Constant-time-ish refusal — don't tip off bots that an email
        # exists as a resident.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Staff portal access only")
    _log.info("Portal login user_id=%s role=%s ip=%s",
              user.id, user.role,
              request.client.host if request.client else "?")
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return _issue_token_for(user)


@router.post("/magic-link", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
def request_magic_link(
    request: Request,
    body: MagicLinkRequestIn,
    council: Council = Depends(get_current_council),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Always returns 202 — does not leak whether the email exists."""
    email = _normalize_email(body.email)
    user = _find_user(db, council.id, email)
    if user is not None and user.status == UserStatus.active.value:
        jti = secrets.token_urlsafe(16)
        token = issue_magic_link_token({"uid": user.id, "cid": council.id, "jti": jti})
        link = f"{settings.public_app_url.rstrip('/')}/magic-link/{token}"
        send_magic_link(to=user.email, link=link)
    return {"status": "ok"}


@router.post("/magic-link/verify", response_model=TokenOut)
def verify_magic_link(
    body: MagicLinkVerifyIn,
    council: Council = Depends(get_current_council),
    db: Session = Depends(get_db),
) -> TokenOut:
    try:
        payload = consume_magic_link_token(body.token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Link {exc.args[0]}"
        ) from exc

    if payload.get("cid") != council.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link not valid for this council")

    jti = str(payload.get("jti", ""))
    if not jti or db.get(MagicLinkUse, jti) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link already used")

    user = db.get(User, int(payload["uid"]))
    if user is None or user.status != UserStatus.active.value or user.council_id != council.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link invalid")

    db.add(MagicLinkUse(jti=jti, user_id=user.id))
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return _issue_token_for(user)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeOut:
    council = db.get(Council, user.council_id)
    assert council is not None
    return MeOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        council=CouncilOut(
            id=council.id,
            slug=council.slug,
            name=council.name,
            brand_color=council.brand_color,
            logo_url=council.logo_url,
            shire_name=council.shire_name,
        ),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    # JWT is stateless; client just drops the cookie. Refresh-token revocation arrives with refresh rotation.
    return None


@router.get("/demo-staff-status")
def demo_staff_status(slug: str = "leeton",
                      db: Session = Depends(get_db)) -> dict[str, object]:
    """Diagnostic — confirms whether the demo staff/admin accounts exist
    for the given council slug. Browser-friendly: pass ?slug=leeton.
    Never returns the password.
    """
    from app.core.config import settings  # noqa: PLC0415
    council = db.query(Council).filter(Council.slug == slug).first()
    if council is None:
        return {"council_slug": slug, "council_exists": False,
                "seed_demo_staff_env": settings.seed_demo_staff,
                "hint": "Pass ?slug=<your-council-slug>. Known slugs are "
                        "seeded in migrations 0005/0007."}
    rows: dict[str, dict[str, object]] = {}
    for label in ("staff", "admin"):
        email = f"demo-{label}@{council.slug}.example.com"
        user = _find_user(db, council.id, email)
        rows[label] = {
            "email": email,
            "exists": user is not None,
            "active": (user.status == UserStatus.active.value) if user else False,
            "role": user.role if user else None,
            "has_password_hash": bool(user and user.password_hash) if user else False,
        }
    return {
        "council_slug": council.slug,
        "council_exists": True,
        "seed_demo_staff_env": settings.seed_demo_staff,
        "accounts": rows,
    }


@router.post("/claim-admin")
def claim_admin(user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> dict[str, str]:
    """One-shot bootstrap: if the caller's email is in the
    BOOTSTRAP_ADMIN_EMAILS env var (comma-separated), elevate them to admin.

    Use this exactly once when standing up a new council so you can then
    promote other users via /admin/users."""
    from app.core.config import settings  # noqa: PLC0415
    allowed = {e.strip().lower() for e in settings.bootstrap_admin_emails.split(",") if e.strip()}
    if not allowed:
        raise HTTPException(status_code=403,
                            detail="BOOTSTRAP_ADMIN_EMAILS env var is not set")
    if user.email.lower() not in allowed:
        raise HTTPException(status_code=403,
                            detail="Your email is not on the bootstrap allowlist")
    if user.role == UserRole.admin.value:
        return {"role": user.role, "message": "Already admin"}
    user.role = UserRole.admin.value
    db.commit()
    return {"role": user.role, "message": "Promoted to admin"}
