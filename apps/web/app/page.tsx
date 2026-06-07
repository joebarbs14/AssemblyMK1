import Link from "next/link";
import { redirect } from "next/navigation";

import { NewsCarousel } from "@/components/NewsCarousel";
import { ServiceGrid } from "@/components/ServiceGrid";
import {
  api,
  type Announcement,
  type DisasterAlertRow,
  type Me,
  type PropertyListItem,
  type ReportListItem,
} from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { TryDemoPanel } from "./TryDemoPanel";

export default async function Home() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let me: Me;
  try {
    me = await api<Me>("/api/auth/me", { token });
  } catch {
    redirect("/login");
  }

  if (me.role === "staff" || me.role === "admin") {
    redirect("/staff");
  }

  const [reports, properties, announcements, alerts] = await Promise.all([
    api<ReportListItem[]>("/api/reports", { token }).catch(() => [] as ReportListItem[]),
    api<PropertyListItem[]>("/api/rates/properties", { token }).catch(() => [] as PropertyListItem[]),
    api<Announcement[]>("/api/announcements", { token }).catch(() => [] as Announcement[]),
    api<DisasterAlertRow[]>("/api/disaster/alerts", { token }).catch(() => [] as DisasterAlertRow[]),
  ]);

  const isEmpty = reports.length === 0 && properties.length === 0;

  return (
    <>
      <style>{CSS}</style>
      <main className="rh">
        <CouncilHeader me={me} />

        <form action="/search" method="GET" className="rh-search">
          <input name="q" placeholder="Search reports, FAQ, businesses…" />
        </form>

        <NewsCarousel announcements={announcements} alerts={alerts} />

        {/* Primary action — Report something */}
        <Link href="/reports/new" className="rh-cta"
              style={{ background: me.council.brand_color }}>
          <span className="rh-cta-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <span className="rh-cta-body">
            <span className="rh-cta-title">Report something</span>
            <span className="rh-cta-sub">Pothole, streetlight, dumping — one minute.</span>
          </span>
          <span className="rh-cta-arrow" aria-hidden="true">→</span>
        </Link>

        {/* Quick-link pill row — visible above the fold */}
        <nav className="rh-quick" aria-label="Quick links">
          <Link href="/reports" className="rh-pill">My reports</Link>
          <Link href="/rates" className="rh-pill">Rates</Link>
          <Link href="/water" className="rh-pill">Water</Link>
          <Link href="/waste" className="rh-pill">Waste</Link>
          <Link href="/account" className="rh-pill">Account</Link>
        </nav>

        {isEmpty && <TryDemoPanel />}

        <ServiceGrid />
      </main>
    </>
  );
}

function CouncilHeader({ me }: { me: Me }) {
  return (
    <header className="rh-head">
      {me.council.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.council.logo_url} alt={me.council.name} className="rh-head-logo" />
      ) : (
        <span className="rh-head-logo rh-head-logo--mark"
              style={{ background: me.council.brand_color }} aria-hidden="true" />
      )}
      <div className="rh-head-text">
        <p className="rh-head-eyebrow">Welcome back</p>
        <p className="rh-head-name">{me.name ?? me.email}</p>
      </div>
      <Link href="/account" aria-label="Account" className="rh-head-account">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
      </Link>
    </header>
  );
}

const CSS = `
.rh {
  max-width: 760px;
  margin: 0 auto;
  padding: 0.5rem 1rem 5rem;
}

/* === Header === */
.rh-head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0 0.625rem;
  margin-bottom: 0.625rem;
  border-bottom: 1px solid var(--border);
}
.rh-head-logo {
  height: 32px;
  width: auto;
  max-width: 160px;
  display: block;
}
.rh-head-logo--mark {
  width: 32px;
  border-radius: var(--r-md);
}
.rh-head-text { flex: 1; min-width: 0; }
.rh-head-eyebrow {
  margin: 0;
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 700;
  line-height: 1;
}
.rh-head-name {
  margin: 2px 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.15;
}
.rh-head-account {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px; height: 34px;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text-primary);
  text-decoration: none;
  flex: 0 0 auto;
}

/* === Search === */
.rh-search { margin-bottom: 0.625rem; }
.rh-search input {
  width: 100%;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-muted);
  outline: none;
}
.rh-search input:focus {
  border-color: var(--text-primary);
  background: var(--surface);
}

/* === CTA === */
.rh-cta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  margin-bottom: 0.625rem;
  color: #fff;
  border-radius: var(--r-lg);
  text-decoration: none;
  box-shadow: var(--e1);
}
.rh-cta-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px; height: 38px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.18);
  flex: 0 0 auto;
}
.rh-cta-body { flex: 1; min-width: 0; line-height: 1.2; }
.rh-cta-title {
  display: block;
  font-weight: 700;
  font-size: 1rem;
}
.rh-cta-sub {
  display: block;
  margin-top: 1px;
  font-size: 0.75rem;
  opacity: 0.9;
}
.rh-cta-arrow {
  font-size: 1.125rem;
  opacity: 0.9;
  flex: 0 0 auto;
}

/* === Quick links pill row (above the fold on mobile) === */
.rh-quick {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
  margin: 0 -1rem 0.875rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
.rh-quick::-webkit-scrollbar { display: none; }
.rh-pill {
  padding: 0.3125rem 0.75rem;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--text-primary);
  white-space: nowrap;
  flex: 0 0 auto;
}

@media (min-width: 600px) {
  .rh { padding: 1rem 1.25rem 4rem; }
  .rh-head {
    padding: 0.5rem 0 1rem;
    margin-bottom: 1rem;
    gap: 0.75rem;
  }
  .rh-head-logo { height: 40px; }
  .rh-head-logo--mark { width: 40px; }
  .rh-head-name { font-size: 1.0625rem; }
  .rh-search input { padding: 0.625rem 0.875rem; font-size: 0.9375rem; }
  .rh-cta { padding: 1rem 1.25rem; margin-bottom: 1rem; gap: 0.875rem; }
  .rh-cta-icon { width: 44px; height: 44px; }
  .rh-cta-title { font-size: 1.0625rem; }
  .rh-cta-sub { font-size: 0.8125rem; }
  .rh-quick { margin-bottom: 1.25rem; }
}
`;
