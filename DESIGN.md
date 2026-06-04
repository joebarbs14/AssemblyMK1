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

## Out of scope (for now)

- Glassmorphism / heavy gradients / neon.
- Animated mascots, illustrations beyond simple iconography.
- Per-user theming. Per-tenant only.
