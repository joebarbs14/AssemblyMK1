# Assembly — Design Brief

Companion to [`REBUILD_PLAN.md`](./REBUILD_PLAN.md). Every milestone's UI
work references this. Update here first if the direction shifts; don't
let visual decisions drift into individual PRs.

## Direction

**Clean & airy + gov.au-trustworthy.** Residents-first warmth (generous
spacing, rounded surfaces, calm colour) on a foundation of government
clarity (strong hierarchy, plain language, WCAG 2.2 AA, fast).

Reference points:
- design.gov.au / Australian Government Design System — structure,
  typography hierarchy, plain-English content patterns
- iOS / Material 3 — touch targets, motion, install-as-app feel
- Service NSW app — the "I trust this and it works" benchmark for AU
  residents

## Principles

1. **Mobile-first, thumb-reachable.** Primary actions sit in the bottom
   third. Navigation is a bottom tab bar on phones, a side rail on
   tablets/desktop.
2. **Plain language.** No bureaucratic jargon. "Report a pothole", not
   "Submit incident notification".
3. **Speed is a feature.** First contentful paint &lt; 1.5s on a mid-range
   phone. Static-by-default in Next.js where possible; stream the rest.
4. **Offline-tolerant.** Anything a resident might be doing on patchy
   coverage (filing a report, viewing a bill) keeps working.
5. **One brand per tenant.** Each council overrides the accent colour
   and logo only — never the type, spacing, or component shapes.

## Tokens

### Colour (light theme)

| Role | Hex | Notes |
| --- | --- | --- |
| Surface | `#FFFFFF` | Cards, sheets |
| Surface muted | `#F6F7F9` | Page background |
| Border | `#E4E7EC` | 1px hairlines |
| Text primary | `#0B1220` | Body |
| Text secondary | `#475467` | Captions, hints |
| Brand (default) | `#0B3D2E` | Deep eucalypt green; overridden per council |
| Brand foreground | `#FFFFFF` | Text on brand |
| Success | `#067647` | Resolved, paid |
| Warning | `#B54708` | SLA at risk, overdue soon |
| Danger | `#B42318` | Breach, overdue, failed payment |
| Info | `#175CD3` | Neutral status |

### Colour (dark theme — built in from day 1, system-following)

| Role | Hex |
| --- | --- |
| Surface | `#0F1419` |
| Surface muted | `#0A0D11` |
| Border | `#1F2A37` |
| Text primary | `#F2F4F7` |
| Text secondary | `#98A2B3` |
| Brand | adjusted per council to maintain 4.5:1 contrast |

### Typography

- **Font**: Inter Variable (latin + latin-ext). Self-hosted via
  `next/font` — no Google Fonts runtime fetch. System fallback:
  `-apple-system, system-ui, Segoe UI, Roboto, sans-serif`.
- **Numeric**: tabular figures for money, dates, counts.
- **Scale** (rem, mobile → desktop bumps via clamp where needed):
  - `display`: 2.25 → 3rem, weight 600, tracking -0.02em
  - `h1`: 1.75rem, 600
  - `h2`: 1.375rem, 600
  - `h3`: 1.125rem, 600
  - `body`: 1rem (16px), 400
  - `body-sm`: 0.875rem, 400
  - `caption`: 0.75rem, 500, uppercase tracking 0.06em
- **Line height**: 1.5 for body, 1.2 for headings.

### Spacing &amp; radius

- Base scale (rem): `0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6`.
- Touch target minimum **44×44 px**.
- Radius: `sm 6px`, `md 10px`, `lg 14px`, `xl 20px`, `full 999px`.
  Default for cards: `lg`. Buttons: `md`. Pills: `full`.

### Elevation

Use sparingly — paper, not pop-ups.
- `e1` (resting card): `0 1px 2px rgba(16,24,40,.06)`
- `e2` (raised sheet, modal): `0 8px 24px rgba(16,24,40,.12)`
- No e3+. If something needs more, the layout is wrong.

### Motion

- Durations: `120ms` micro, `200ms` standard, `320ms` enter/exit.
- Easing: `cubic-bezier(.2,.8,.2,1)` for enter, `cubic-bezier(.4,0,.6,1)` for exit.
- Respect `prefers-reduced-motion` always.

## Components (M1–M3 priority)

Built as a small set of primitives in `apps/web/components/ui/`. No
heavyweight UI library; Radix Primitives + Tailwind tokens. Each
component has visible focus, keyboard support, and an ARIA story.

- `Button` — variants: primary, secondary, ghost, danger; sizes: sm/md/lg.
- `Card` — surface, optional header/footer, `lg` radius.
- `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`.
- `Sheet` — bottom sheet on mobile, side dialog on desktop.
- `Tabs`, `Accordion`, `Tooltip`, `Toast`.
- `StatusBadge` — semantic colours mapped to report status.
- `NavBar` (bottom on mobile), `SideRail` (≥md).
- `EmptyState`, `Skeleton`, `ErrorState`.
- `MoneyAmount` — tabular figures, AUD format, balance vs credit colouring.
- `Address`, `MapPin` — typed wrappers around MapLibre.

## PWA polish

- App icon set generated from the council brand mark at install time
  (maskable + monochrome).
- Splash colour matches `theme_color`.
- Bottom-tab nav respects iOS safe-area insets.
- "Add to Home Screen" hint appears once per device after the second
  successful report or payment — never on first load.
- Push permission prompted only after a user opts in to "notify me
  about updates", never on app open.

## Content style

- Sentence case for buttons and labels. Title Case only for proper nouns.
- Numbers: `$1,234.50`, never `$1234.5`. Dates: `Fri 6 Jun` (short) /
  `Friday, 6 June 2026` (long), 24h time.
- Errors say what happened and what to do next. No stack traces, no
  "Error 500".
- Empty states suggest the next action.

## Accessibility (non-negotiable)

- WCAG 2.2 AA from M1. Automated axe-core in CI; manual VoiceOver pass
  before each milestone ships.
- Colour is never the only signal — pair with icon + text.
- Keyboard navigable end-to-end. Visible focus rings everywhere (2px
  brand-coloured, 2px offset).
- Form errors are announced via `aria-live=polite` and tied to inputs
  with `aria-describedby`.

## Staff Console

The staff console shares **tokens, fonts, and components** with the
resident app but inverts the priorities: information density, keyboard
flow, and SLA awareness over hand-holding. It's desktop-first; tablets
get a split layout; phone gets a single-pane sheet (staff occasionally
triage from a phone, especially field crews).

### Layout (desktop ≥1280px)

Three columns:

1. **Side rail** (220px) — saved channels:
   - My queue (assigned to me)
   - My team's queue
   - All open (council-wide)
   - SLA at risk (&lt; 25% time left)
   - Awaiting resident
   - By category (collapsible)
   - Drafts + scheduled (announcements)
2. **List pane** (380–520px, resizable) — virtualised table; row =
   priority chip + title + category + ward + age + SLA badge + assignee
   avatar. Row height 40px default; toolbar toggle to 32px compact (up
   to 200 rows on a 14" screen).
3. **Detail pane** (fills the rest) — the report **workspace** (next section).

Tablet (768–1280): list + detail, side rail collapses to icons.
Phone (&lt;768): single pane, list ↔ detail navigation via push transitions.

### Density &amp; tokens

- Base type drops one step: body `0.875rem`, captions `0.6875rem`.
- Spacing scale skips `1.25` — use `1` or `1.5`. Tables use `0.5` row
  padding in compact mode.
- Card radius drops to `md` (10px); table rows are `sm` (6px) on hover.
- Brand accent used **only** for primary buttons, the active row, focus
  rings, and SLA-green badges. Everything else is neutral.

### Keyboard (gov-grade speed)

| Key | Action |
| --- | --- |
| `j` / `k` | Move list selection down / up |
| `o` / `Enter` | Open selected report in detail pane |
| `a` | Assign… (focus user picker) |
| `t` | Change team |
| `s` | Change status |
| `p` | Change priority |
| `i` | Toggle internal-only on the composer |
| `e` | Expand detail to full width |
| `⌘/Ctrl + Enter` | Send the composer |
| `[` / `]` | Previous / next report in list |
| `?` | Shortcut help sheet |

Visible focus rings always — keyboard users are first-class staff.

### SLA visualisation

- Each row carries an SLA badge: time remaining or overdue duration,
  paired with a colour (green &gt;25%, amber 5–25%, red &lt;5% or breached)
  AND an icon (clock / clock-3 / alert).
- Detail header shows a thin progress bar across the SLA window. Once
  breached, the bar goes solid red and a "Breached" pill appears next
  to the title.
- Never colour-only — always icon + text + colour together.

### Bulk actions

- Checkbox column on the list; row select with `x`.
- Toolbar appears above the list when ≥1 selected: Assign, Change
  status, Add tag, Merge as duplicates, Send templated message, Export
  CSV.
- Confirm sheet before any action affecting ≥10 reports.

## Shared workspace (the report detail pane)

A single screen that both residents and staff see — same data,
different chrome. This is where coordination happens.

### Common layout

- **Header**: report title, category icon, status pill, priority,
  SLA chip (staff only), location chip (opens map), assignee avatar.
- **Timeline** (centre): unified `report_event` stream, newest at
  bottom, auto-scrolls on new events via SSE. Each event is rendered
  by its `kind`:
  - `message` — chat bubble; left-aligned for the other side,
    right-aligned for you; staff messages show team + role under the
    name.
  - `status_change`, `assignment`, `priority_change` — neutral
    centred "system" rows with an icon.
  - `attachment_added` — inline thumbnail or doc card.
  - `file_request` — yellow-tinted card with "Upload now" button on
    the resident side; staff side shows "Awaiting resident" with a
    timer.
  - `appointment_proposed/confirmed/cancelled/completed` — calendar
    card with date/time, location, Add to calendar button (.ics).
  - `signature_requested/provided` — signature card; resident side
    shows the pad inline, staff side shows the captured signature.
- **Composer** (sticky bottom):
  - Resident: message input + attach button. One Send action.
  - Staff: tabbed composer — Message / Request file / Change status /
    Propose appointment / Request signature. Each tab is a quick
    form; submitting emits the matching event. An `internal` toggle
    sits in the corner — internal events never appear on the
    resident side.
- **Right column** (staff desktop only): assignment + team picker,
  category, priority, SLA, tags, original photos grid, location map,
  resident profile card with link to their property/account.

### Empty / waiting states

- New report (no events yet): timeline shows the original submission
  card with photos and a "Waiting for council to respond" hint for
  the resident; staff side shows "Unassigned" with a one-click
  "Assign to me + acknowledge" button.
- `awaiting_resident` status: resident side surfaces the open
  request as a banner at the top of the timeline ("Council is
  waiting on you — see request below"); staff side shows last-pinged
  time and a "Nudge resident" button (sends a follow-up push).

### Notifications mapping

| Event kind | Resident push | Resident email | Staff push (assignee) | Staff push (team) |
| --- | --- | --- | --- | --- |
| Resident creates report | — | "Got it, report #ABC received" | — | "New report in your team" |
| Staff message (non-internal) | ✓ | digested if &gt;3/day | — | — |
| Resident message | — | — | ✓ | — |
| Status change | ✓ | ✓ | — | — |
| Assignment to me | — | — | ✓ | — |
| File request | ✓ | ✓ | — | — |
| File provided | — | — | ✓ | — |
| Appointment proposed | ✓ | ✓ + .ics | — | — |
| Appointment confirmed | ✓ | ✓ + .ics | ✓ | — |
| Signature requested | ✓ | ✓ | — | — |
| Signature provided | — | — | ✓ | — |

User preferences override these in `/account/notifications`.

### Mobile staff (field crews)

- Same timeline + composer; tabbed composer collapses to a "Reply"
  bottom sheet with options.
- Big "I'm here" geo-stamp button: posts an `appointment_completed`
  event with current location and a timestamp.
- Camera-first attach for proof-of-completion.

## Out of scope (for now)

- Glassmorphism / heavy gradients / neon.
- Animated mascots, illustrations beyond simple iconography.
- Per-user theming. Per-tenant only.
- Staff-to-staff team chat outside a report (deferred until a real
  ask appears).
