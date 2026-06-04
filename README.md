# Assembly

Multi-tenant SaaS connecting council staff with residents. Mobile-first PWA.

See [`REBUILD_PLAN.md`](./REBUILD_PLAN.md) for the full architecture and roadmap.

## Layout

```
apps/
  web/       Next.js 15 (App Router) — residents + staff + admin PWA
  api/       FastAPI + Postgres + PostGIS
packages/
  shared-types/
infra/
  render.yaml
  .env.example
client/, server/   Legacy v0 (archived at v1 cutover)
```

## Local dev

```bash
# Web
pnpm install
pnpm dev                            # http://localhost:3000

# API
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../../infra/.env.example .env    # then edit DATABASE_URL etc.
alembic upgrade head
uvicorn app.main:app --reload       # http://localhost:8000
```

Healthchecks: `GET /api/health` on both services.

## Milestones

| | Scope |
| --- | --- |
| M1 | Foundations + deploy skeleton (this PR) |
| M2 | Auth, multi-tenancy, OIDC SSO (Microsoft/Google) |
| M3 | Reports core (resident submit + staff inbox + teams) |
| M4 | PWA, offline queue, web push |
| M5 | Rates accounts & viewing |
| M6 | Payments (PayPal + BPAY) |
| M7 | Announcements & consultations |
| M8 | Admin, audit, APP/NDB compliance, hardening |
| M9–M12 | Animals, DA, Water, Waste upgrades (v1.x) |
