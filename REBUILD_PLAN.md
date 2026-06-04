# AssemblyMK1 — Ground-Up Rebuild Plan

> Status: **APPROVED v1**. All 10 open questions resolved (see section J). Awaiting go-ahead to start M1.
> Branch: `claude/confident-dijkstra-RMBH2`.
> Design direction: see [`DESIGN.md`](./DESIGN.md) — clean & airy + gov.au-trustworthy.

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
- **Tenancy**: **multi-tenant SaaS**; each council is a tenant identified by slug + custom subdomain (e.g. `parramatta.app`). Every domain row carries `council_id`; queries always filter by it.
- **DB**: Postgres 16 (Render Sydney, managed) + PostGIS. SQLAlchemy 2.x + Alembic.
- **Auth — residents**: Auth.js (NextAuth v5) on client; JWT (RS256) from FastAPI for API. Magic link primary (Resend), password fallback.
- **Auth — staff/admin**: **OIDC SSO via Microsoft Entra ID + Google Workspace** (per-tenant config). TOTP MFA fallback when SSO unavailable. Magic link disabled for staff.
- **Maps**: MapLibre GL JS + **self-hosted Protomaps PMTiles** (Australia extract) stored in Cloudflare R2. OSM data, attribution required, free for commercial use.
- **Photos/files**: Cloudflare R2, presigned PUT direct from client.
- **Payments**: **PayPal Smart Checkout (AUD)** for cards + PayPal wallet; **BPAY deep-link** via `council.bpay_biller_code` (resident pays via their bank, reconciled by CRN). No Stripe.
- **Push**: Web Push (VAPID) via `web-push` on FastAPI; subscription per device.
- **Email**: Resend (magic links, status updates) on the production transactional sender domain, with SPF + DKIM + DMARC enforced.
- **PWA**: Serwist for service worker + background sync (offline report queue).
- **Background jobs**: Render background worker + RQ (Redis Sydney). SLA escalations, push fan-out, email retries, BPAY CRN reconciliation imports.
- **Observability**: Sentry, Render logs.
- **Compliance posture**: APP (Australian Privacy Principles) + NDB (Notifiable Data Breaches) + WCAG 2.2 AA built in from M1. **IRAP/ISM not in v1** (Render is not IRAP-assessed); a gap-assessment doc is produced in M8 so the system is IRAP-ready for a future migration if a council customer demands it.

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
- `user` (id, council_id, email unique-per-council, name, phone, password_hash nullable, role: resident|staff|admin, status, created_at, mfa_totp_secret nullable)
- `sso_identity` (id, user_id, provider: microsoft|google, subject, email, raw_claims JSONB, linked_at) — staff SSO link.
- `tenant_sso_config` (id, council_id, provider: microsoft|google, tenant_id_or_workspace, client_id, client_secret_encrypted, allowed_email_domains, enabled) — per-council SSO config.
- `staff_team` (id, council_id, name, default_category_id)
- `staff_team_member` (team_id, user_id, role: member|lead)
- `device` (id, user_id, push_subscription JSONB, ua, last_seen_at)

**Reports**
- `report_category` (id, council_id, key, label, icon, sla_hours, default_team_id, requires_photo, custom_fields_schema JSONB)
- `report` (id, council_id, ward_id, category_id, reporter_user_id, title, description, location_point geography(POINT,4326), address_text, status: new|triaging|assigned|in_progress|awaiting_resident|resolved|closed|duplicate|rejected, priority, assignee_user_id, team_id, sla_due_at, created_at, resolved_at, custom_fields JSONB, public)
- `report_attachment` (id, report_id, kind: photo|video|doc|signature, r2_key, mime, width, height, exif JSONB, uploaded_by_user_id, in_response_to_event_id nullable)
- `report_event` — **unified timeline** powering the shared workspace. One row per thing that happened. Columns: id, report_id, actor_user_id (nullable for system events), kind, body (nullable text), internal (bool — staff-only when true), metadata JSONB, created_at. `kind` enum:
  - `message` — chat-style message (resident or staff)
  - `status_change` — status transition; metadata = `{from, to}`
  - `assignment` — assignee/team change; metadata = `{from_user, to_user, from_team, to_team}`
  - `priority_change` — metadata = `{from, to}`
  - `attachment_added` — metadata = `{attachment_id}`
  - `file_request` — staff asks resident for a photo/doc; metadata = `{requested_kinds, due_at, fulfilled_by_attachment_id}`
  - `appointment_proposed|confirmed|cancelled|completed` — metadata = `{appointment_id}`
  - `signature_requested|provided` — metadata = `{signature_id}`
- `report_appointment` (id, report_id, proposed_by_user_id, slot_start, slot_end, location_text, address_point geography nullable, status: proposed|confirmed|cancelled|completed, confirmed_at, completed_at, notes)
- `report_signature` (id, report_id, signer_user_id, kind: resident_acknowledge|staff_completion, signed_at, attachment_id FK→report_attachment, ip_address, user_agent)
- `report_subscription` (report_id, user_id) — who gets push/email on new events.

**Rates / payments** (port-forward existing)
- `property` (id, council_id, owner_user_id, address, gps_point geography, lga_zone, land_size_sqm, parcel_geojson, property_type)
- `property_ownership` (property_id, user_id, role: owner|tenant, verified, verified_at)
- `rates_account` (id, property_id 1:1, account_number, balance_cents, next_due_date, ebilling_enabled, direct_debit JSONB)
- `rates_invoice` (id, account_id, issue_date, due_date, amount_cents, status, line_items JSONB, pdf_r2_key)
- `payment` (id, account_id, invoice_id, amount_cents, currency AUD, provider: paypal|bpay|manual, provider_ref, status, paid_at, raw_webhook JSONB, crn nullable) — `crn` populated for BPAY reconciliation.
- `bpay_crn` (id, account_id, crn unique-per-council, biller_code, generated_at, used_at) — per-account BPAY Customer Reference Number; deep-linked into resident's banking app where supported.
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
- Resident: `POST /magic-link`, `POST /magic-link/verify`, `POST /password/login`, `POST /register`, `POST /logout`
- Staff/admin SSO: `GET /sso/:provider/start` (microsoft|google), `GET /sso/:provider/callback`, `POST /sso/link`, `POST /mfa/totp/setup`, `POST /mfa/totp/verify`
- Common: `GET /me`, `POST /devices`, `DELETE /devices/:id`

**Reports — resident** (`/api/reports`)
- `GET /categories`
- `POST /`, `GET /`, `GET /:id`
- `GET /:id/events` — paginated history
- `GET /:id/events/stream` — **SSE live updates** (new events as they arrive)
- `POST /:id/events` — post a chat `message` (body) or attach files (`attachment_added` follows the presign+PUT flow)
- `POST /:id/appointments/:appt/confirm` / `POST /:id/appointments/:appt/cancel`
- `POST /:id/signatures` — provide a requested signature (canvas → PNG → R2)
- `POST /:id/subscribe`, `DELETE /:id/subscribe`
- `POST /attachments/presign`

**Reports — staff** (`/api/staff/reports`)
- `GET /` (filters), `GET /map`, `GET /:id`
- `GET /:id/events`, `GET /:id/events/stream` (SSE, includes internal events)
- `POST /:id/events` — `message` (with `internal` flag), `file_request`, `status_change`, `assignment`, `priority_change`
- `POST /:id/appointments` — propose a slot
- `POST /:id/signature-requests` — request resident sign off
- `PATCH /:id` (shortcut for status/assignee/priority — emits the matching events)
- `POST /:id/merge` — mark as duplicate of another report
- `GET /queues/summary`

**Rates / payments** (`/api/rates`)
- `GET /properties`, `GET /properties/:id`
- `GET /properties/:id/invoices`, `GET /invoices/:id`
- `POST /invoices/:id/paypal-order` — create PayPal order; returns approval URL.
- `POST /invoices/:id/paypal-capture` — server-side capture after approval.
- `GET /properties/:id/bpay` — returns biller_code + CRN + bank deep-link (UPI-style `bpay://...` where supported; otherwise instructions).
- `POST /properties/:id/payment-plan`
- `GET /properties/:id/payments`
- `POST /webhooks/paypal` (idempotent, signature-verified)
- `POST /webhooks/bpay-reconciliation` — nightly bank-feed import endpoint (staff/admin only).

**Comms** (`/api/announcements`, `/api/consultations`)
- `GET /announcements`, `GET /announcements/:id`
- `GET /consultations/:id`, `POST /consultations/:id/responses`
- Staff: `POST/PATCH/POST publish` mirrors.

**Admin** (`/api/admin`)
- `users`, `categories`, `wards`, `audit`.

### E. Auth & Roles

- **Roles**: `resident`, `staff`, `admin` on `user`. Optional `staff_team` membership.
- **Resident login**: magic link primary (Resend), password fallback. RS256 JWT, 1h access + 30d refresh in httpOnly cookie.
- **Staff/admin login**: **OIDC SSO (Microsoft Entra ID or Google Workspace)** per-tenant. Configured via `tenant_sso_config` per council. **TOTP MFA fallback** for staff who don't have SSO. Magic-link disabled for staff role.
- **SSO flow**: `/api/auth/sso/microsoft/start?council=<slug>` → IdP → callback → match by `sso_identity.subject`, autocreate user on first login if email domain in tenant's `allowed_email_domains` and an invite exists. Refresh tokens stored encrypted; revoke on role downgrade.
- **Session**: Auth.js JWT strategy mirrored as httpOnly cookie. CSRF via SameSite=Lax + double-submit token on state-changing requests.
- **Authorisation**: FastAPI `get_current_user` + `require_role`, `require_council_match`. Multi-tenancy enforced at query level (always filter by `council_id`); resident requests resolve council via subdomain.

### F. Key Technical Concerns

- **Photo/file storage**: Cloudflare R2; presigned PUT from FastAPI; signed GET for read. Render disks NOT used for user media.
- **Push**: Web Push + VAPID. Worker fans out on report status change and announcement publish. Email fallback when push subscription stale.
- **Maps**: **Self-hosted Protomaps PMTiles** (Australia extract, ~5GB) stored in Cloudflare R2; MapLibre GL JS in browser reads the PMTiles directly via HTTP range requests. **Pelias self-hosted** or **Nominatim self-hosted** on a small worker for geocoding (rate-limited). Zero per-tile cost; fully commercial-safe with OSM attribution.
- **Payments**:
  - **PayPal Smart Checkout (AUD)** — server-side order create + capture, idempotent webhook, signature-verified. Covers cards (Visa/MC/Amex) and PayPal wallet.
  - **BPAY deep-link** — per-account CRN generated, displayed with biller code; resident pays via their bank; reconciled via nightly bank statement import (M6 stub, finalised when first council onboards a real bank feed).
  - **Payment plans** — modelled in DB; instalments billed via PayPal subscriptions where the resident opts in, otherwise via scheduled reminders + manual pay.
- **Real-time (shared workspace)**: **Server-Sent Events** over FastAPI for `/reports/:id/events/stream` and `/staff/reports/:id/events/stream`. Redis pub/sub channel per report (`report:{id}:events`) fans out across workers. Reconnect with `Last-Event-ID`; falls back to 10s poll if `EventSource` unavailable. Websockets reserved for a later "staff team chat" feature if needed.
- **Offline queue**: Dexie stores pending reports, chat messages, and attachment blobs. Service worker `sync` flushes when online (re-presign, upload to R2, post event). "Queued" badge in UI; messages show a clock icon until acknowledged by the server.
- **Geo**: PostGIS for spatial queries (reports near me, in ward). GiST index on `report.location_point`.
- **Rate limiting**: Render-level + FastAPI slowapi on auth and report-create.
- **Privacy / AU compliance (v1)**:
  - **APP 1–13** — privacy policy page, data collection notices, opt-in for non-essential notifications, profile delete + data export endpoints, age-of-account-deletion enforcement.
  - **NDB scheme** — breach detection hooks (failed-auth spikes, mass-export events), incident playbook doc, 30-day notification template, contact register.
  - **WCAG 2.2 AA** — automated axe-core checks in CI; manual screen reader pass before launch.
  - **Audit log** — append-only `audit_event` table for every state-changing API call; staff actions, admin config, payments, exports.
  - **Encryption** — Render Postgres encryption at rest; secrets in Render env or a managed KMS; PII column-level encryption for `sso_identity.raw_claims` and `tenant_sso_config.client_secret`.
  - **Retention** — configurable per-tenant: reports default 7y, audit 7y, payments 7y (AU tax), residents soft-delete on request + hard-delete after 30d grace.
- **IRAP/ISM**: NOT implemented in v1 (Render not assessed). M8 produces an IRAP gap-assessment doc and a migration playbook to AWS Sydney / Azure Australia Central for future tenants who require it.

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

**Render services** (in `infra/render.yaml`, **region: Sydney** for all):
- `web` — Node web service; build `pnpm -w build --filter web`; start `pnpm --filter web start`.
- `api` — Python web service; build `uv sync && alembic upgrade head`; start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- `worker` — Background worker; `rq worker -u $REDIS_URL`.
- `db` — Render Postgres (managed, Sydney).
- `redis` — Render Redis (managed, Sydney; for RQ + caching).
- Env: `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET_MEDIA`, `R2_BUCKET_PMTILES`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `RESEND_SENDER_DOMAIN`, `SENTRY_DSN`. Per-tenant SSO creds (`ENTRA_*`, `GOOGLE_*`) stored encrypted in `tenant_sso_config`, not env.

### H. Migration & Data

**Decision: green-field deploy.** Current Render DB is not carried forward. The legacy `assembly-frontend` and Flask server are kept on `main` until the new stack is launched on a staging URL, then archived. Seed scripts will create one sample council (`demo`) and a small set of demo categories, wards, and a staff/admin user for smoke tests.

The modelling work in current `models.py` is used as a **reference** for shaping the new SQLAlchemy models (especially rates), but no rows are migrated.

### I. Milestones (PR-sized, dependency order)

**v1 (launch)**

**M1 — Foundations & deploy skeleton (S)** — monorepo scaffold, pnpm workspace, Next.js 15 boots, FastAPI boots, Postgres connected, Alembic baseline, Render Sydney blueprint, healthchecks, Sentry, CI (lint + typecheck + test). **Deliverable**: both services live on Render at staging URL.

**M2 — Auth, multi-tenancy, SSO (M/L)** — `council`, `ward`, `user`, `sso_identity`, `tenant_sso_config` tables; subdomain-based tenant resolution; resident magic-link + password; **staff/admin OIDC SSO via Microsoft Entra ID + Google Workspace**; TOTP MFA fallback; Auth.js wiring; session cookies; `/auth/me`; role guards; staff invite flow; per-tenant SSO config admin screen. **Deliverable**: residents sign up + log in; staff log in via Microsoft/Google; tenant isolation enforced.

**M3 — Reports core + shared workspace (resident + staff coordinated) (XL)** — `report*` tables including the unified `report_event` timeline, `staff_team`, `staff_team_member`, PostGIS, R2 presigned uploads, resident submit flow (multi-step PWA with camera + geo), resident list/detail with **live event timeline (SSE)**, **chat messages** (resident ↔ assigned staff), **file requests** (staff asks resident for more photos, resident attaches), staff inbox + triage, **team-based routing** (auto-route by category → default team), assignment, internal vs public events, email + push notifications on each new event. **Deliverable**: a report is a shared workspace — resident files it; staff triage, message, ask for files, change status; resident sees everything live; both sides get pinged on every update.

**M3.5 — Appointments + completion signatures (M)** — `report_appointment` + `report_signature` tables, staff "propose a visit" UX with slot picker, resident confirm/decline + add to calendar (.ics), staff "request resident sign-off" on completion with on-device signature pad → PNG → R2, resident e-sign acknowledgement on closure, full appointment + signature events surfaced in the timeline. **Deliverable**: in-app scheduling and proof-of-completion built into the report workspace.

**M4 — PWA, offline queue, web push (M)** — Serwist service worker, install prompt, manifest, Dexie offline queue + background sync, Web Push VAPID + device registration + fan-out worker, notification prefs UI. **Deliverable**: installable app, offline drafts, push status updates.

**M5 — Rates accounts & viewing (M)** — port property/rates schema, `/api/rates/properties`, `/invoices`, resident rates dashboard, invoice PDF viewer, valuation & charges, `bpay_crn` generation. **Deliverable**: residents see rates, balance, due date, invoice history, BPAY deep-link.

**M6 — Payments & plans (M)** — **PayPal Smart Checkout integration** (order create + capture + signature-verified webhook), BPAY deep-link UI + nightly reconciliation stub, `payment` table, receipts, payment plan setup + instalment reminders via worker. **Deliverable**: residents pay by card / PayPal wallet; BPAY CRN displayed; plans tracked.

**M7 — Announcements & consultations (M)** — announcement CRUD (staff), targeting by council/ward/category, publish workflow, resident feed, push fan-out, consultation responses + CSV export. **Deliverable**: staff broadcasts; residents read + respond.

**M8 — Admin, audit, compliance, hardening (M)** — admin screens (categories, wards GeoJSON, council branding, role mgmt, SSO config), audit log surfacing, rate limiting, OWASP pass, WCAG 2.2 AA, **APP/NDB compliance docs + IRAP gap-assessment doc**, privacy policy/T&Cs pages, data export + delete endpoints, staging→prod cutover. **Deliverable**: production-ready RC.

**v1.x (post-launch upgrades to legacy modules)**

**M9 — Animals (S/M)** — port + upgrade Animal adoption module: photos via R2, search/filter UI, "Apply to adopt" flow as a typed report sub-category, staff inbox tab for adoption applications. **Deliverable**: full adoption workflow live.

**M10 — Development Applications (M)** — port DA tables; resident DA submit flow with documents (R2), GPS, neighbouring-property notify list (PostGIS within radius); staff DA queue with public-exhibition timer; resident DA tracker; public DA register page. **Deliverable**: DA lifecycle end-to-end.

**M11 — Water consumption (S)** — port WaterConsumption; resident water dashboard with quarter chart, allocation vs consumed, bill due date, push reminder; high-usage alert. **Deliverable**: residents see water usage + bills.

**M12 — Waste collection schedules (S/M)** — port WasteCollection + entitlements; resident "When's my bin night?" widget (address → route geojson lookup), push the night before, missed-collection report shortcut; staff route GeoJSON upload. **Deliverable**: per-address waste schedule live.

### J. Resolved decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Tenancy | **Multi-tenant SaaS**, subdomain-per-council |
| 2 | Payments | **PayPal Smart Checkout (cards + wallet, AUD) + BPAY deep-link** via council biller code |
| 3 | Data migration | **Green-field**, no carry-over |
| 4 | Staff SSO | **OIDC: Microsoft Entra ID + Google Workspace**, TOTP MFA fallback |
| 5 | Compliance | **APP + NDB + WCAG 2.2 AA in v1**; IRAP/ISM gap-assessment in M8, migration plan deferred |
| 6 | Hosting region | **Render Sydney** for web + db + redis + worker |
| 7 | Domain + email | Production domain + transactional sender domain via Resend; SPF + DKIM + DMARC enforced. Final domains TBC at M1 kickoff |
| 8 | Legacy modules | **Keep + upgrade**, shipped in v1.x as M9 (Animals) → M10 (DA) → M11 (Water) → M12 (Waste) |
| 9 | Maps | **Self-hosted Protomaps PMTiles + OSM** via Cloudflare R2 + MapLibre GL JS (free-for-commercial) |
| 10 | Staff teams | **Modelled in v1**; category → default team auto-routing in M3 |

### K. Remaining inputs needed at M1 kickoff

These don't block planning but must be supplied at M1 boot:
1. Production domain (e.g. `assembly.app`) and transactional sender domain (e.g. `mail.assembly.app`).
2. Cloudflare R2 account + 2 buckets (`assembly-media`, `assembly-pmtiles`) with API tokens.
3. PayPal business account (sandbox client_id + secret for M6 dev; live creds for prod cutover).
4. Render team + Sydney region access confirmed; Postgres + Redis instances provisioned.
5. Resend account on the sender domain with SPF/DKIM/DMARC verified.
6. Sentry org + DSNs for `web` and `api`.
7. One pilot council's name + slug + branding (logo, hex colour) to seed the `demo` tenant.
