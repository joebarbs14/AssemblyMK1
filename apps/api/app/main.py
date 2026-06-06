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
    council_ops,
    council_v3,
    council_v4,
    council_v5,
    council_v6,
    council_v7,
    dev_uploads,
    devices,
    health,
    payments,
    rates,
    reports,
    staff_reports,
    v1x,
    v2_features,
)

if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.env, traces_sample_rate=0.1)

from app.services import scheduler

app = FastAPI(title="Assembly API", version="0.1.0")
app.state.limiter = limiter


@app.on_event("startup")
def _startup_scheduler() -> None:
    if settings.env != "test":
        scheduler.start()


@app.on_event("shutdown")
def _shutdown_scheduler() -> None:
    scheduler.shutdown()
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
app.include_router(devices.router, prefix="/api")
app.include_router(v1x.router, prefix="/api")
app.include_router(v2_features.router, prefix="/api")
app.include_router(v2_features.public_router, prefix="/api")
app.include_router(council_ops.router, prefix="/api")
app.include_router(council_ops.public_router, prefix="/api")
app.include_router(council_v3.router, prefix="/api")
app.include_router(council_v3.public_router, prefix="/api")
app.include_router(council_v4.router, prefix="/api")
app.include_router(council_v4.public_router, prefix="/api")
app.include_router(council_v5.router, prefix="/api")
app.include_router(council_v5.public_router, prefix="/api")
app.include_router(council_v6.router, prefix="/api")
app.include_router(council_v7.router, prefix="/api")
app.include_router(dev_uploads.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "assembly-api", "docs": "/docs", "health": "/api/health"}
