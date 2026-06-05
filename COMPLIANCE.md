# Compliance posture

## In scope for v1

- **Australian Privacy Principles (APP 1–13)** — Privacy Act 1988 (Cth)
- **Notifiable Data Breaches scheme** — Part IIIC of the Privacy Act
- **WCAG 2.2 AA** — accessibility baseline

## Out of scope for v1

- IRAP / ISM — Render is not IRAP-assessed. See `IRAP-GAP.md` for a
  forward-looking gap assessment; if a council customer requires IRAP,
  we migrate to AWS Sydney GovCloud / Azure Australia Central.

---

## APP mapping

| APP | Title | How Assembly satisfies it |
| --- | --- | --- |
| 1 | Open and transparent management of personal information | `/privacy` page published; internal policy documented in this repo |
| 2 | Anonymity and pseudonymity | Not practical for rates/staff workflows; offered for consultations in M7.5 |
| 3 | Collection of solicited personal information | Signup collects email + name + password only; reports collect what the resident chooses to share |
| 4 | Dealing with unsolicited personal information | Unsolicited photos/data deleted within 30 days unless retained for an open report |
| 5 | Notification of collection | Privacy notice surfaced on signup ("we never share your data outside your council") |
| 6 | Use or disclosure | Used only for the purpose collected: routing reports, processing payments, sending consented announcements |
| 7 | Direct marketing | Opt-in only via account → notification preferences |
| 8 | Cross-border disclosure | Hosting in Singapore (free plan) flagged; Sydney on paid plan. Cloudflare R2 multi-region |
| 9 | Adoption, use and disclosure of government identifiers | No tax file numbers, Medicare numbers, or DVA numbers collected |
| 10 | Quality of personal information | Profile editable by user (M2.x) |
| 11 | Security of personal information | argon2id password hashing, RS256 JWT, TLS in transit, encryption at rest (Render Postgres), per-tenant council scoping, rate limiting on auth, audit log |
| 12 | Access to personal information | `GET /api/account/export` returns everything we hold about the caller as JSON |
| 13 | Correction of personal information | Profile fields editable (M2.x); audit corrections logged |

## NDB scheme readiness

- **Detection**: failed-auth spikes and mass-export events trip alerts via Sentry (M8.x).
- **Containment playbook**: revoke compromised JWT signing keys (`JWT_PRIVATE_KEY` rotation), disable affected accounts, force re-login.
- **Assessment window**: 30 days from suspicion to OAIC notification, per legislation.
- **Notification template**: held by the council's privacy officer; copy lives in council ops repo.
- **Contact**: `privacy@assembly.local` (set to council privacy officer at cutover).

## Audit log

`audit_event` table is append-only. Every state-changing admin action
records:
- actor, council, IP, user-agent
- action verb (`user.invite`, `category.create`, `account.export`, …)
- target type + id
- metadata (before/after where meaningful)

Retention: 7 years per AU records policy. Visible to admins at `/admin/audit`.

## Data lifecycle

| Data class | Retention | Notes |
| --- | --- | --- |
| User profile | Until deletion + 30-day grace | Personal fields nulled on `DELETE /api/account` |
| Reports | 7 years | Required for council records; resident can request export |
| Payments | 7 years | AU tax / records law |
| Audit log | 7 years | Append-only |
| Magic-link tokens | 15 min | Single-use enforced; hash + jti stored |
| Web push subscriptions | Until invalidated by browser | Removed on logout |

## Accessibility

- WCAG 2.2 AA from M1. Automated axe-core in CI (M8.x).
- Manual screen-reader pass before each milestone ships.
- Colour never the only signal — paired with icon + text.
- Visible focus rings (2px gold, 2px offset).
- Touch targets ≥ 44 × 44 px.
