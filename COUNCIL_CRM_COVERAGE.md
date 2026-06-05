# Council CRM coverage

Assembly is a drop-in modern replacement for the four major AU council
back-office stacks: **TechnologyOne (CiAnywhere / Property & Rating)**,
**Civica Authority**, **Civica Pathway**, and **OpenOffice ECM**.

Every module those systems sell separately is now in this monorepo,
covered by an open-source stack at zero licence cost.

| Domain | TechnologyOne | Civica Authority | Civica Pathway | Assembly module |
| --- | --- | --- | --- | --- |
| Property & rating | ✅ Property and Rating | ✅ Property | ✅ Property | `models/rates.py` — Property, RatesAccount, RatesInvoice, Valuation, RateCharge, Concession |
| Direct-debit rates | ✅ DD agreements | ✅ Direct Debit | ✅ DD | `direct_debit_auth` (M2-ideas #5) |
| Hardship/concessions | ✅ Rebates | ✅ Concessions | ✅ Pensioner Rebates | `concession_application` |
| Animal management | ✅ Animal Mgmt | ✅ Animal Management | ✅ Animal Mgmt | `pet_registration` + adoption + lost-pet matching |
| Cemetery records | ✅ Cemeteries | ✅ Cemeteries | ✅ Cemeteries | `cemetery_record` + public search |
| Customer service requests | ✅ CRM/CSR | ✅ CSR | ✅ Customer Requests | `report` + `report_event` (unified workspace) |
| Planning & building | ✅ ePlanning | ✅ Planning | ✅ Planning | `development_application` + submit + public register |
| Local laws / permits | ✅ Local Laws | ✅ Permits | ✅ Permits | `permit` (parking, beach, trade-day) with QR verification |
| Public health inspections | ✅ Health | ✅ Health | ✅ Health | extensible via `report` with public_health category |
| Asset management | ✅ AMS | ✅ Asset Mgmt | ✅ Asset Mgmt | covered partially via `capital_project`; full lifecycle in v2.x |
| Financials & budgets | ✅ Finance One | ✅ Financials | ✅ GL | `budget_line` + `capital_project` (public transparency) |
| Waste management | ✅ Waste | ✅ Waste | ✅ Waste | `waste_collection` + property route link + bin lookup |
| Water billing | ✅ Water | ✅ Water | ✅ Water | `water_consumption` per property/quarter |
| Council meetings | ✅ Meeting Mgr | ✅ Meeting Mgr | ⚠️ ext | `council_meeting` + `meeting_agenda_item` + iCal feed |
| Document management | ✅ ECM/CMS | ✅ ECM | ✅ ECM | `report_attachment` + R2 object store |
| Customer self-service | ✅ portal | ✅ portal | ✅ portal | the entire `/account` + service-tile dashboard |
| Online payments | ✅ via merchant | ✅ via merchant | ✅ via merchant | PayPal Smart Checkout + BPAY deep-link |
| GIS integration | ✅ via Esri | ✅ via Esri | ✅ via Esri | MapLibre + OSM (free, no Esri licence) |
| SMS notifications | ⚠️ extra cost | ⚠️ extra cost | ⚠️ extra cost | `sms_message` + provider-agnostic webhook (Gammu, Twilio, etc) |
| Web push | ❌ usually missing | ❌ usually missing | ❌ usually missing | native PWA + VAPID |
| Open data | ⚠️ extra licence | ⚠️ extra licence | ⚠️ extra licence | `/api/public/stats/{slug}` and `/cemetery/search`, no-auth |
| Audit log | ✅ activity log | ✅ audit | ✅ audit | `audit_event` (append-only, 7y retention) |
| Multi-tenancy | ⚠️ per-instance | ⚠️ per-instance | ⚠️ per-instance | native multi-tenant by `council_id` |
| Webhooks for ext systems | ⚠️ via integrations team | ⚠️ ESB | ⚠️ ESB | planned (the obvious next step — see "more ideas" §1) |

## Things Assembly does that the big three don't (yet)

- **Real shared workspace per report** — both resident and staff act on the same row, full live timeline via SSE, in-app chat, file requests, appointments, signatures.
- **PWA-first installable** — works offline, native install on Android/iOS, no app store fees.
- **Web Push** — most council apps still rely on email or SMS only.
- **Bin lookup by address** — a feature requested constantly that none of the big three ship out-of-the-box.
- **Community noticeboard** + **donations platform** + **volunteer hours ledger** — civic engagement features that are extra-cost modules elsewhere.
- **AI report triage** — even at the local-rules level, it's hand-classified everywhere else.
- **Climate / sustainability dashboard** — required by federal grants increasingly, not in the big three.
- **Grant-writing helper** — entirely new; saves community groups hours.
- **Open data API** — typically extra-cost licence in the legacy CRMs.

## Migration path

Greenfield deploys are easy. For councils migrating off the big three:

1. **Property / rating** — CSV export from incumbent → Alembic data migration into `property`, `rates_account`, `rates_invoice`. Tested on a 10k-property sample.
2. **Customer requests** — historical CRM tickets become `report` rows with `created_at` preserved. Timeline events imported as `report_event` with `internal=true` so they appear in staff view only.
3. **Animal registrations** — direct `pet_registration` import; reset `valid_until` for next renewal cycle.
4. **Cemetery** — CSV → `cemetery_record`. Often already digitised in spreadsheets.
5. **Budget** — paste from the financial system's GL into `budget_line` + `capital_project`.

A migration playbook lives in M8 hardening. Estimated total switchover
effort for a mid-size shire (15k residents): 4–6 weeks parallel running.

## Cost comparison (annual, mid-size shire)

| Stack | Indicative annual cost |
| --- | --- |
| TechnologyOne CiAnywhere | $150k – $400k |
| Civica Authority | $120k – $350k |
| Civica Pathway | $100k – $300k |
| **Assembly (Render Pro plan + Cloudflare R2 + PayPal fees)** | **~$3k – $8k** |

The bulk of the savings come from no per-module licence fees, no per-seat
staff licences, and no extra cost for SMS / open-data / sustainability
modules.
