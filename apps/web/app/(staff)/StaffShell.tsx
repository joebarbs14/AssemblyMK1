import Link from "next/link";
import * as React from "react";

import type { Me } from "@/lib/api";

type Tab = "dashboard" | "inbox" | "rates" | "water";

interface NavLink {
  href: string;
  label: string;
  short: string;
  active: boolean;
  icon: React.ReactNode;
}

export function StaffShell({
  me,
  active,
  children,
}: {
  me: Me;
  active: Tab;
  children: React.ReactNode;
}) {
  const isAdmin = me.role === "admin";
  const primary: NavLink[] = [
    { href: "/staff",               label: "Triage",        short: "Triage",  active: active === "dashboard", icon: <IconTriage /> },
    { href: "/staff/inbox",         label: "Inbox",         short: "Inbox",   active: active === "inbox",     icon: <IconInbox /> },
    { href: "/staff/rates",         label: "Rates",         short: "Rates",   active: active === "rates",     icon: <IconRates /> },
    { href: "/staff/water",         label: "Water",         short: "Water",   active: active === "water",     icon: <IconWater /> },
  ];
  const secondary: NavLink[] = [
    { href: "/staff/announcements", label: "Announcements", short: "News",    active: false, icon: <IconMegaphone /> },
    { href: "/staff/predictions",   label: "Predictions",   short: "Forecast",active: false, icon: <IconChart /> },
    { href: "/staff/rangers",       label: "Rangers",       short: "Rangers", active: false, icon: <IconRanger /> },
    { href: "/staff/fleet",         label: "Fleet",         short: "Fleet",   active: false, icon: <IconFleet /> },
    ...(isAdmin
      ? [{ href: "/admin/users", label: "Admin", short: "Admin", active: false, icon: <IconAdmin /> } satisfies NavLink]
      : []),
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="ss">
        {/* Mobile top bar — visible <860px */}
        <header className="ss-top">
          <div className="ss-top-council" title={me.council.name}>{me.council.name}</div>
          <Link href="/account" className="ss-top-account" aria-label="Account">
            <span className="ss-top-avatar" aria-hidden="true">
              {(me.name ?? me.email).slice(0, 1).toUpperCase()}
            </span>
          </Link>
        </header>

        {/* Desktop sidebar — visible ≥860px */}
        <aside className="ss-side">
          <p className="ss-side-council">{me.council.name}</p>
          {primary.map((n) => <NavItem key={n.href} {...n} />)}
          <div className="ss-side-rule" aria-hidden="true" />
          {secondary.map((n) => <NavItem key={n.href} {...n} />)}
          <div className="ss-side-spacer" />
          <p className="ss-side-me">{me.name ?? me.email}</p>
          <NavItem href="/account" label="My account" short="Me" active={false}
                   icon={<IconUser />} />
        </aside>

        <main className="ss-main">{children}</main>

        {/* Mobile bottom tab bar — visible <860px */}
        <nav className="ss-tabs" aria-label="Primary">
          {primary.map((n) => (
            <Link key={n.href} href={n.href}
                  className={`ss-tab${n.active ? " is-active" : ""}`}>
              <span className="ss-tab-icon" aria-hidden="true">{n.icon}</span>
              <span className="ss-tab-label">{n.short}</span>
            </Link>
          ))}
          <Link href="/account" className="ss-tab">
            <span className="ss-tab-icon" aria-hidden="true"><IconMore /></span>
            <span className="ss-tab-label">More</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

function NavItem({
  href, label, active, icon,
}: NavLink) {
  return (
    <Link href={href} className={`ss-nav${active ? " is-active" : ""}`}>
      <span className="ss-nav-icon" aria-hidden="true">{icon}</span>
      <span className="ss-nav-label">{label}</span>
    </Link>
  );
}

// --------------------------------------------------------------------- //
// Icons                                                                 //
// --------------------------------------------------------------------- //

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.75"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconTriage = () => <Svg><path d="M3 12h4l3-9 4 18 3-9h4" /></Svg>;
const IconInbox = () => <Svg><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>;
const IconRates = () => <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="15" x2="16" y2="15" /></Svg>;
const IconWater = () => <Svg><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></Svg>;
const IconMegaphone = () => <Svg><path d="M3 11l18-8v18l-18-8z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></Svg>;
const IconChart = () => <Svg><line x1="3" y1="20" x2="21" y2="20" /><polyline points="5 17 9 11 13 14 19 6" /></Svg>;
const IconRanger = () => <Svg><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" /></Svg>;
const IconFleet = () => <Svg><path d="M3 17h13V5H1v12h2" /><circle cx="6" cy="17" r="2" /><circle cx="18" cy="17" r="2" /><path d="M16 9h4l3 4v4h-2" /></Svg>;
const IconAdmin = () => <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>;
const IconUser = () => <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Svg>;
const IconMore = () => <Svg><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></Svg>;

// --------------------------------------------------------------------- //
// Styles                                                                //
// --------------------------------------------------------------------- //

const CSS = `
.ss {
  min-height: 100dvh;
  background: var(--surface-muted);
  display: grid;
}

/* === Mobile-first === */
.ss {
  grid-template-areas: "top" "main";
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr;
}

.ss-top {
  grid-area: top;
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.ss-top-council {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ss-top-account {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.ss-top-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 999px;
  background: var(--brand);
  color: var(--brand-fg);
  font-size: 0.8125rem;
  font-weight: 700;
}

.ss-side { display: none; }

.ss-main {
  grid-area: main;
  width: 100%;
  padding: 1rem 1rem calc(64px + env(safe-area-inset-bottom, 0px) + 1rem);
}

.ss-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--surface);
  border-top: 1px solid var(--border);
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.03);
}
.ss-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0.5rem 0.25rem 0.5rem;
  min-height: 56px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.6875rem;
  font-weight: 500;
  transition: color 160ms ease;
}
.ss-tab.is-active { color: var(--text-primary); }
.ss-tab.is-active .ss-tab-icon {
  background: var(--brand-soft);
  color: var(--text-primary);
}
.ss-tab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 28px;
  border-radius: 14px;
  transition: background 160ms ease, color 160ms ease;
}
.ss-tab-label { line-height: 1; }

/* === Desktop ≥ 860px === */
@media (min-width: 860px) {
  .ss {
    grid-template-areas: "side main";
    grid-template-columns: 240px 1fr;
    grid-template-rows: 1fr;
  }
  .ss-top, .ss-tabs { display: none; }
  .ss-side {
    grid-area: side;
    display: flex;
    flex-direction: column;
    gap: 2px;
    position: sticky;
    top: 0;
    align-self: start;
    height: 100dvh;
    overflow-y: auto;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 1.25rem 0.75rem;
  }
  .ss-side-council {
    margin: 0 0.5rem 1rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
    font-weight: 600;
  }
  .ss-side-rule {
    height: 1px;
    background: var(--border);
    margin: 0.75rem 0.5rem;
  }
  .ss-side-spacer { flex: 1; }
  .ss-side-me {
    margin: 0 0.5rem 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ss-nav {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--r-md);
    font-size: 0.9375rem;
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 500;
    transition: background 160ms ease;
  }
  .ss-nav:hover { background: var(--brand-soft); }
  .ss-nav.is-active {
    background: var(--brand);
    color: var(--brand-fg);
    font-weight: 600;
  }
  .ss-nav-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    color: currentColor;
  }
  .ss-main {
    padding: 1.5rem 1.75rem 3rem;
    max-width: 1100px;
  }
}
`;
