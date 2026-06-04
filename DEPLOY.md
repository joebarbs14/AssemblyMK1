# Deploying Assembly v2 to Render

This deploys the new monorepo (`apps/web` + `apps/api`) **alongside**
the existing legacy app — no impact to current `assemblymk1.onrender.com`
users until you swap the domain.

## Prerequisites (5 min)

1. **Cloudflare R2** — sign up (free), create two buckets:
   - `assembly-media-staging`
   - `assembly-pmtiles-staging` (for M3.2+ map tiles, optional now)

   In the R2 dashboard, **Manage R2 API Tokens** → create a token with
   "Object Read & Write" scope, scoped to those buckets. Save the
   Access Key ID, Secret Access Key, and your Account ID.

2. **Resend** — sign up, verify a sender domain (e.g. `mail.assembly.app`).
   Get an API key. SPF + DKIM + DMARC records get added to DNS.

3. *(Optional, M2.x)* **Sentry** project for `web` and `api`.

## Deploy

### Option A — Render Blueprint (one click)

1. Push your branch to GitHub (already done).
2. In Render, **New → Blueprint**, point at this repo on branch
   `claude/confident-dijkstra-RMBH2`, file `infra/render.yaml`.
3. Render creates:
   - `assembly-web` (Node web service)
   - `assembly-api` (Python web service)
   - `assembly-db` (Postgres 16, free tier)
4. Fill in the prompted env vars (R2 keys, Resend API key, WEB_ORIGIN
   pointing at the Render web service URL).
5. After the first deploy succeeds, set `NEXT_PUBLIC_API_BASE` on the
   web service to the API service URL (Render shows it once `assembly-api`
   is live).

### Option B — manual

Create each service individually pointing at this repo with the build
+ start commands from `infra/render.yaml`. Same env vars apply.

## Region

`infra/render.yaml` is set to `singapore` because Render's `sydney`
region requires a paid plan as of writing. The latency from Singapore
to Sydney is ~95ms — fine for staging. Once on a paid plan, change all
three `region:` lines to `sydney`.

## After it's live

- Open the web service URL — you should see the new login page.
- Create an account (`/signup`) — the magic link prints to the API
  service logs in dev mode. Set `RESEND_API_KEY` to use real email.
- From the dashboard, hit `/rates` → "Load demo property" to populate
  sample rates data.
- File a report at `/reports/new`.

## Cutover

When you're ready to make the new app the live one:

1. In your DNS provider, point `assemblymk1.onrender.com` (or your
   custom domain) at the new `assembly-web` Render service instead of
   the old service.
2. The legacy `client/` + `server/` folders can be removed in a
   follow-up commit. Keep them on `main` until cutover is verified.

## Where things land

| You set | … as |
| --- | --- |
| `WEB_ORIGIN` on api | Allow-listed CORS origin (your web URL) |
| `NEXT_PUBLIC_API_BASE` on web | Where the web calls the API |
| `R2_*` on api | Direct uploads, signed downloads |
| `RESEND_API_KEY` on api | Magic-link delivery |
| `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` | Auto-generated in dev; set in prod |

Until `RESEND_API_KEY` is set, magic-link emails print to the API
service logs. Use those for testing without DNS work.
