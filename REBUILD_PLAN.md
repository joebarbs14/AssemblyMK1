# AssemblyMK1 — Ground-Up Rebuild Plan

> Status: **DRAFT for approval**. No code will change until you sign off.
> Branch: `claude/confident-dijkstra-RMBH2`.

---

## Step 1 — Audit of Existing Repo

### Current data model (`server/models.py`)
- **Resident** (id, name, email unique, password_hash, created_at) — single user type; no role field, no staff users.
- **Council** (id, name, shire_name, logo_url, population, lga_shape_file, ts)
- **CouncilContact** (1:1 council → urls: query_valuation, apply_concession, change_address)
- **Property** (id, resident_id FK, council_id FK, address, property_type primary|investment, gps_coordinates JSONB, shape_file_data GeoJSON text, land_size_sqm, property_value, land_value, zone)
- **Process** (id, resident_id, category, title, form_data JSONB, status default 'pending', submitted_at, updated_at) — generic catch-all "submission" model; closest thing to a report.
- **Policy** (id, category, title, document_url)
- **WaterConsumption** (property_id, quarter_start_date, consumed_litres, allocated_litres, amount_owing, bill_due_date)
- **Animal** (council_id, name, type, breed, mixed, sex, age, temperament, status, main_photo_url, gallery_urls JSONB) — adoptions
- **WasteCollection** (council_id, collection_type, collection_day, collection_frequency, next_collection_date, route_geojson JSONB, notes)
- **DevelopmentApplication** (resident_id, property_id, council_id, application_type, status default 'Submitted', submission_date, approval_date, estimated_cost, description, documents_url JSONB, gps_coordinates JSONB)
- **Rates domain**: RatesAccount, RatesBill, RatesInvoice, Valuation, RateCharge, WasteEntitlement, Concession, PropertyOverlay, BillingSetting (cents-based money, instalment plans, concessions, valuations, overlays, council contact deep-links).

### Current API surface (Flask blueprints)
- **/auth**: `POST /register`, `POST /login` (Authlib HS256 JWT, 24h, sub=resident.id)
- **/dashboard**: `GET /` — single fat endpoint bucketed by category
- **/process**: `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` (resident-owned; PUT has a `datetime` bug)
- **/admin**: `GET /all`, `POST /update_status/:id` — **effectively unauthenticated** (no guard)
- **/user**: `GET /profile`
- **/rates**: `GET /properties` — rich rates block

### Current frontend (`client/src`)
- React 18 CRA, HashRouter, three routes: `/` (Login), `/signup` (Signup), `/dashboard` (protected).
- Detail pages exist as components but appear unrouted: AnimalDetails, DevelopmentDetails, RatesDetails, WasteDetails, WaterDetails.
- Auth helper stores JWT in localStorage; bug: decodes `decoded.id` but token uses `sub`.
- `idb` and `leaflet` already in deps — offline + map intent there but not wired up. No service worker, no real manifest.

### Worth carrying forward as requirements
1. **AU council context**: shire_name, LGA shape files, council logo, multi-council support partially modelled.
2. **Rich rates schema** — cents-based money, instalment plans, concessions, valuations, overlays, waste entitlements, council contact deep-links. Preserve entities, not Flask code.
3. **Property as anchor object** for rates/water/waste — residents own properties tied to councils.
4. **Form-data JSONB pattern** on Process — useful for flexible per-category fields on reports.
5. **Auth UX baseline**: email + password initial, JWT bearer, 24h expiry.
6. **Categories taxonomy**: Rates, Water, Development, Community, Roads, Waste, Animals, Public Health, Environment — reuse as report categories.
7. **GeoJSON storage** for property shapes and waste routes.
8. **Render deployment posture** (single web service + Postgres) — extend for new monorepo.

### Gaps to fill in the rebuild
- No incident/report entity (Process is too generic — no photo, no geo on submission, no SLA, no assignee).
- No staff/admin user model — only Resident; `/admin` is unauthenticated.
- No assignments, queues, status events log, SLAs.
- No announcements, consultations, or comms entities.
- No payment integration or payment intent records.
- No attachments table.
- No notifications (push or email).
- No service worker / offline submission queue despite `idb` being installed.

---

## Step 2 — Rebuild Plan

### A. Recommended Stack

**Pick: Next.js 15 (App Router, React 19) + FastAPI (Python 3.12) + Postgres 16 + Cloudflare R2 for media.**

Why: Next.js App Router gives us one mobile-first PWA codebase that serves residents and the staff console under different route groups, with first-class service-worker/PWA support (Serwist), built-in image optimisation for photo-heavy reports, and Server Components for data-heavy staff lists. FastAPI keeps Python (we already understand the rates domain in Python, want type discipline via Pydantic, and need Stripe/webhook ergonomics), is async (good for push fan-out and websockets later), and deploys cleanly to Render. We reject Supabase because rates/payments need server-side business logic and audited webhooks that don't fit row-level-security cleanly, and reject SvelteKit because existing React fluency dominates the ramp-up cost saving. R2 over S3 because zero egress fees matter when residents upload many phone photos.

Supporting:
- **DB**: Postgres 16 (Render managed) + PostGIS. SQLAlchemy 2.x + Alembic.
- **Auth**: Auth.js (NextAuth v5) on client; JWT (RS256) from FastAPI for API. Magic link primary, password fallback.
- **Maps**: MapLibre GL JS + MapTiler free tier; upgrade path to Protomaps PMTiles in R2.
- **Photos/files**: Cloudflare R2, presigned PUT direct from client.
- **Payments**: Stripe Checkout (AUD); BPAY deep-link via existing CouncilContact pattern for v1.
- **Push**: Web Push (VAPID) via `web-push` on FastAPI; subscription per device.
- **Email**: Resend (magic links, status updates).
- **PWA**: Serwist for service worker + background sync (offline report queue).
- **Background jobs**: Render background worker + RQ (Redis). SLA escalations, push fan-out, email retries.
- **Observability**: Sentry, Render logs.

### B. Information Architecture (mobile-first)

**Resident app** (route group `(resident)`):
- `/` — Home: nearby map + "Report an issue" CTA + my open reports + announcements feed.
- `/report/new` — Multi-step: category → photo → location (auto-GPS, draggable pin) → description → submit.
- `/reports`, `/reports/[id]` — List + detail with timeline, comments, photos, map.
- `/announcements`, `/announcements/[id]` — Feed + detail (consultation responses).
- `/rates` — Property selector; balance, next due, instalments, recent bills.
- `/rates/[propertyId]/pay` — Stripe Checkout / payment plan.
- `/rates/[propertyId]/history` — Payment + bill history.
- `/account` — Profile, properties, notification prefs, install-PWA hint.

**Staff console** (route group `(staff)`, role-gated):
- `/staff` — Triage dashboard: queue summary, SLA breaches, my assignments.
- `/staff/inbox` — Filterable report queue (status, category, ward, age, assignee).
- `/staff/reports/[id]` — Triage view: assign, change status, internal notes, request more info, duplicate, resident-visible update.
- `/staff/queues` — Per-team queues.
- `/staff/map` — Cluster map of open reports.
- `/staff/announcements`, `/staff/consultations`.

**Admin** (route group `(admin)`):
- `/admin/users` — Staff invite, role assignment.
- `/admin/categories` — Category & SLA config.
- `/admin/wards` — Geo boundaries upload (GeoJSON).
- `/admin/councils` — Tenant config, branding, BPAY/Stripe creds.
- `/admin/audit` — Audit log.

### C. Data Model (entities, key fields, relationships)

**Tenancy & users**
- `council` (id, name, shire_name, slug, timezone, logo_url, brand_color, lga_geojson, bpay_biller_code, stripe_account_id)
- `ward` (id, council_id, name, code, boundary_geojson)
- `user` (id, council_id, email unique-per-council, name, phone, password_hash nullable, role: resident|staff|admin, status, created_at)
- `staff_team` (id, council_id, name, default_category_id)
- `staff_team_member` (team_id, user_id)
- `device` (id, user_id, push_subscription JSONB, ua, last_seen_at)

**Reports**
- `report_category` (id, council_id, key, label, icon, sla_hours, default_team_id, requires_photo, custom_fields_schema JSONB)
- `report` (id, council_id, ward_id, category_id, reporter_user_id, title, description, location_point geography(POINT,4326), address_text, status: new|triaging|assigned|in_progress|resolved|closed|duplicate|rejected, priority, assignee_user_id, team_id, sla_due_at, created_at, resolved_at, custom_fields JSONB, public)
- `report_attachment` (id, report_id, kind: photo|video|doc, r2_key, mime, width, height, exif JSONB, uploaded_by_user_id)
- `report_status_event` (id, report_id, actor_user_id, from_status, to_status, note, internal, created_at)
- `report_comment` (id, report_id, author_user_id, body, internal, created_at)
- `report_subscription` (report_id, user_id)

**Rates / payments** (port-forward existing)
- `property` (id, council_id, owner_user_id, address, gps_point geography, lga_zone, land_size_sqm, parcel_geojson, property_type)
- `property_ownership` (property_id, user_id, role: owner|tenant, verified, verified_at)
- `rates_account` (id, property_id 1:1, account_number, balance_cents, next_due_date, ebilling_enabled, direct_debit JSONB)
- `rates_invoice` (id, account_id, issue_date, due_date, amount_cents, status, line_items JSONB, pdf_r2_key)
- `payment` (id, account_id, invoice_id, amount_cents, currency AUD, provider: stripe|bpay|manual, provider_ref, status, paid_at, raw_webhook JSONB)
- `payment_plan` (id, account_id, total_cents, instalments JSONB, status)
- `valuation`, `rate_charge`, `concession`, `property_overlay`, `waste_entitlement`, `billing_setting`, `council_contact_link` — keep from current schema.

**Comms**
- `announcement` (id, council_id, author_user_id, title, body_markdown, hero_image_r2_key, audience: council|ward|category, ward_id, category_id, publish_at, expires_at, status)
- `consultation` (id, announcement_id, opens_at, closes_at, schema JSONB, allow_anonymous)
- `consultation_response` (id, consultation_id, respondent_user_id, answers JSONB, submitted_at)

**Notifications**
- `notification` (id, user_id, kind, payload JSONB, sent_via: push|email|inapp, read_at, created_at)

**Offline queue** (client-only, Dexie/IndexedDB): pending reports + attachment blobs awaiting connectivity.

### D. API Surface (REST, FastAPI)

**Auth** (`/api/auth`)
- `POST /magic-link`, `POST /magic-link/verify`
- `POST /password/login`, `POST /register`, `POST /logout`
- `GET /me`
- `POST /devices`, `DELETE /devices/:id`

**Reports — resident** (`/api/reports`)
- `GET /categories`
- `POST /`, `GET /`, `GET /:id`
- `POST /:id/comments`, `POST /:id/subscribe`, `DELETE /:id/subscribe`
- `POST /attachments/presign`

**Reports — staff** (`/api/staff/reports`)
- `GET /` (filters), `GET /map`, `GET /:id`
- `PATCH /:id`, `POST /:id/comments`, `POST /:id/merge`
- `GET /queues/summary`

**Rates / payments** (`/api/rates`)
- `GET /properties`, `GET /properties/:id`
- `GET /properties/:id/invoices`, `GET /invoices/:id`
- `POST /invoices/:id/pay`, `POST /properties/:id/payment-plan`
- `GET /properties/:id/payments`
- `POST /webhooks/stripe` (idempotent)

**Comms** (`/api/announcements`, `/api/consultations`)
- `GET /announcements`, `GET /announcements/:id`
- `GET /consultations/:id`, `POST /consultations/:id/responses`
- Staff: `POST/PATCH/POST publish` mirrors.

**Admin** (`/api/admin`)
- `users`, `categories`, `wards`, `audit`.

### E. Auth & Roles

- **Roles**: `resident`, `staff`, `admin` on `user`. Optional `staff_team` membership.
- **Resident login**: magic link primary (Resend), password fallback. RS256 JWT, 1h access + 30d refresh in httpOnly cookie.
- **Staff login**: same magic link with **mandatory TOTP MFA** once role is staff/admin. SSO (SAML/OIDC) per-tenant later — flagged.
- **Session**: Auth.js JWT strategy mirrored as httpOnly cookie. CSRF via SameSite=Lax + double-submit token on state-changing requests.
- **Authorisation**: FastAPI `get_current_user` + `require_role`, `require_council_match`. Multi-tenancy enforced at query level (always filter by `council_id`).

### F. Key Technical Concerns

- **Photo/file storage**: Cloudflare R2; presigned PUT from FastAPI; signed GET for read. Render disks NOT used for user media.
- **Push**: Web Push + VAPID. Worker fans out on report status change and announcement publish. Email fallback when push subscription stale.
- **Maps**: MapLibre GL JS + MapTiler free OSM tiles initially. Geocoding via MapTiler.
- **Payments**: Stripe Checkout (AUD), Stripe Customer per resident. BPAY deep-link in v1 via `council.bpay_biller_code`. Idempotent webhook → `payment` row. Payment plans modelled in DB.
- **Offline queue**: Dexie stores pending reports + blobs. Service worker `sync` flushes when online (re-presign, upload to R2, post report). "Queued" badge in UI.
- **Geo**: PostGIS for spatial queries (reports near me, in ward). GiST index on `report.location_point`.
- **Rate limiting**: Render-level + FastAPI slowapi on auth and report-create.
- **Privacy/AU compliance**: Australian Privacy Principles + NDB scheme flagged in open Qs. Default posture: minimisation, encryption at rest (Render Postgres default), audit log, configurable retention.

### G. Repo Structure (monorepo, pnpm + uv)

```
AssemblyMK1/
  apps/
    web/                      # Next.js 15 PWA (residents + staff + admin)
      app/
        (resident)/...
        (staff)/...
        (admin)/...
        api/health/route.ts
      components/
      lib/                    # api client, auth, dexie offline queue
      public/manifest.json
      service-worker/         # Serwist config
      next.config.mjs
      package.json
    api/                      # FastAPI
      app/
        main.py
        core/ (config, security, db, deps)
        models/                # SQLAlchemy
        schemas/               # Pydantic
        routers/ (auth, reports, staff_reports, rates, payments,
                  announcements, consultations, admin, webhooks)
        services/ (r2, push, email, stripe, geocode)
        workers/ (rq tasks)
      migrations/              # Alembic
      pyproject.toml
      uv.lock
  packages/
    shared-types/             # zod + generated TS types from OpenAPI
  infra/
    render.yaml               # Render blueprint
    .env.example
  package.json (pnpm workspace)
  README.md
  REBUILD_PLAN.md
```

**Render services** (in `infra/render.yaml`):
- `web` — Node web service; build `pnpm -w build --filter web`; start `pnpm --filter web start`.
- `api` — Python web service; build `uv sync && alembic upgrade head`; start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- `worker` — Background worker; `rq worker -u $REDIS_URL`.
- `db` — Render Postgres (managed).
- `redis` — Render Redis (managed; for RQ + caching).
- Env: `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `R2_*`, `STRIPE_*`, `VAPID_*`, `RESEND_API_KEY`, `MAPTILER_KEY`, `SENTRY_DSN`.

### H. Migration & Data

**Default: green-field deploy.** No data migration scripted. Current DB likely contains test/seed data only (`scripts/seed_rates.py`, no migration history). Confirm.

**If data must carry**: one-shot Alembic data migration mapping `resident → user (role='resident')`; `council`, `property`, `valuation`, `rate_charge`, `rates_account`, `rates_invoice`, `concession`, `property_overlay`, `waste_entitlement`, `billing_setting`, `council_contact` → near-1:1. `process` → drop (no clean mapping to new `report`). `animal`, `waste_collection`, `water_consumption`, `development_application` deferred (out of scope for v1).

### I. Milestones (PR-sized, dependency order)

**M1 — Foundations & deploy skeleton (S)** — monorepo scaffold, pnpm workspace, Next.js 15 boots, FastAPI boots, Postgres connected, Alembic baseline, Render blueprint, healthchecks, Sentry, CI (lint + typecheck + test). **Deliverable**: both services live on Render at staging URL.

**M2 — Auth, users, tenancy (M)** — `user`, `council`, `ward` tables; magic-link + password auth; Auth.js wiring; session cookies; `/auth/me`; role guards; council inference from email/address; staff invite. **Deliverable**: residents sign up + log in; staff invited; tenant isolation enforced.

**M3 — Reports core (resident submit + staff inbox) (L)** — `report*` tables, PostGIS, R2 presigned uploads, resident submit flow (multi-step PWA with camera + geo), resident list/detail, staff inbox + triage, status events timeline, email notifications. **Deliverable**: end-to-end report flow with photo + geo; staff triage; resident sees status changes.

**M4 — PWA, offline queue, web push (M)** — Serwist service worker, install prompt, manifest, Dexie offline queue + background sync, Web Push VAPID + device registration + fan-out worker, notification prefs UI. **Deliverable**: installable app, offline drafts, push status updates.

**M5 — Rates accounts & viewing (M)** — port property/rates schema, `/api/rates/properties`, `/invoices`, resident rates dashboard, invoice PDF viewer, valuation & charges. **Deliverable**: residents see rates, balance, due date, invoice history.

**M6 — Payments & plans (M)** — Stripe Checkout, `payment` table, idempotent webhook, receipts, payment plan setup + instalment reminders via worker. **Deliverable**: residents pay by card; plans tracked.

**M7 — Announcements & consultations (M)** — announcement CRUD (staff), targeting by council/ward/category, publish workflow, resident feed, push fan-out, consultation responses + CSV export. **Deliverable**: staff broadcasts; residents read + respond.

**M8 — Admin, audit, hardening (S/M)** — admin screens (categories, wards GeoJSON, council branding, role mgmt), audit log surfacing, rate limiting, OWASP pass, WCAG 2.2 AA, staging→prod cutover. **Deliverable**: production-ready RC.

### J. Open Questions (must answer before M1)

1. **Tenancy**: single-tenant (one council) or multi-tenant SaaS? If single, which council?
2. **Payments provider**: Stripe (cards, AUD) confirmed? BPAY in v1 or deep-link only? Centrepay/Easypay required?
3. **Data migration**: green-field, or carry forward current councils/properties/rates data? (Need DB dump if carrying.)
4. **Staff SSO**: any council requiring SAML/OIDC SSO in v1? Microsoft Entra ID likely?
5. **AU compliance scope**: formal Privacy Act / APP compliance docs + NDB response plan in v1? IRAP / ISM (state-gov only)?
6. **Hosting region**: Render Sydney for web + db + redis confirmed? Data-residency requirement?
7. **Domain & email**: production domain + transactional sender domain (SPF/DKIM/DMARC for Resend)?
8. **Scope of dropped modules**: are Animals, DA tracking, WaterConsumption, WasteCollection schedules dropped from v1, kept read-only, or postponed to phase 2?
9. **Map provider budget**: MapTiler free tier (50k loads/mo) acceptable for v1, or commit to Mapbox / self-host Protomaps now?
10. **Staff teams structure**: model teams (Roads, Waste, Parks) in v1 routing, or per-user assignment only? Affects M3 scope.
