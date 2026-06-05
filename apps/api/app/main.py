import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.routers import (
    account,
    admin,
    announcements,
    appointments,
    auth,
    dev_uploads,
    health,
    payments,
    rates,
    reports,
    staff_reports,
    v1x,
)

if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.env, traces_sample_rate=0.1)

app = FastAPI(title="Assembly API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(staff_reports.router, prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(announcements.staff_router, prefix="/api")
app.include_router(rates.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(payments.webhook_router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(v1x.router, prefix="/api")
app.include_router(dev_uploads.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "assembly-api", "docs": "/docs", "health": "/api/health"}
