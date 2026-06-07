import Link from "next/link";
import { redirect } from "next/navigation";

import { api, type Me, type QueueSummary, type ReportListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { StaffShell } from "../StaffShell";

export default async function StaffDashboardPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let me: Me;
  try {
    me = await api<Me>("/api/auth/me", { token });
  } catch {
    redirect("/login");
  }
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  const [summary, recent] = await Promise.all([
    api<QueueSummary>("/api/staff/reports/queues/summary", { token }),
    api<ReportListItem[]>("/api/staff/reports?limit=6", { token }),
  ]);

  return (
    <StaffShell me={me} active="dashboard">
      <style>{CSS}</style>
      <div className="sd">
        <header className="sd-head">
          <p className="sd-eyebrow">Triage</p>
          <h1 className="sd-h1">Good {greeting()}{me.name ? `, ${firstName(me.name)}` : ""}.</h1>
        </header>

        <section className="sd-stats" aria-label="Queue summary">
          <Stat label="Open" value={summary.total_open} />
          <Stat label="Mine" value={summary.mine} />
          <Stat label="At risk" value={summary.sla_at_risk}
                tone={summary.sla_at_risk > 0 ? "warn" : "muted"} />
          <Stat label="Breached" value={summary.sla_breached}
                tone={summary.sla_breached > 0 ? "danger" : "muted"} />
        </section>

        <section className="sd-card">
          <header className="sd-card-head">
            <h2 className="sd-card-h2">Recent reports</h2>
            <Link href="/staff/inbox" className="sd-card-link">Inbox →</Link>
          </header>
          {recent.length === 0 ? (
            <p className="sd-empty">No reports yet.</p>
          ) : (
            <ul className="sd-list">
              {recent.map((r) => (
                <li key={r.id} className="sd-li">
                  <Link href={`/staff/reports/${r.id}`} className="sd-li-link">
                    <span className="sd-li-title">{r.title}</span>
                    <span className="sd-li-meta">
                      {r.category_label} · {r.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StaffShell>
  );
}

function Stat({
  label, value, tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "muted" | "warn" | "danger";
}) {
  return (
    <div className={`sd-stat sd-stat--${tone}`}>
      <p className="sd-stat-label">{label}</p>
      <p className="sd-stat-value tnum">{value}</p>
    </div>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const CSS = `
.sd-head { margin: 0 0 0.875rem; }
.sd-eyebrow {
  margin: 0 0 0.125rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.sd-h1 {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.sd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.sd-stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 0.625rem 0.75rem;
}
.sd-stat-label {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.sd-stat-value {
  margin: 0.125rem 0 0;
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--text-primary);
}
.sd-stat--warn   .sd-stat-value { color: var(--warning, #b58300); }
.sd-stat--danger .sd-stat-value { color: var(--danger,  #b42318); }
.sd-stat--muted  .sd-stat-value { color: var(--text-secondary); }

.sd-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 0.875rem 1rem;
}
.sd-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}
.sd-card-h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
.sd-card-link {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
}
.sd-empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.sd-list { list-style: none; padding: 0; margin: 0; }
.sd-li { border-top: 1px solid var(--border); }
.sd-li:first-child { border-top: 0; }
.sd-li-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0;
  text-decoration: none;
  color: inherit;
  min-height: 36px;
}
.sd-li-title {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.sd-li-meta {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  white-space: nowrap;
  flex: 0 0 auto;
}

/* Larger screens — slightly more breathing room. */
@media (min-width: 600px) {
  .sd-h1 { font-size: 1.625rem; }
  .sd-stats { gap: 0.75rem; }
  .sd-stat { padding: 0.75rem 1rem; }
  .sd-stat-value { font-size: 1.75rem; }
  .sd-card-h2 { font-size: 1rem; }
}
`;
