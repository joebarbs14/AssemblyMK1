import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    api<ReportListItem[]>("/api/staff/reports?limit=8", { token }),
  ]);

  return (
    <StaffShell me={me} active="dashboard">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1.25rem" }}>Triage</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: "1.5rem",
        }}
      >
        <Stat label="Open" value={summary.total_open} />
        <Stat label="Assigned to me" value={summary.mine} />
        <Stat label="SLA at risk" value={summary.sla_at_risk} tone={summary.sla_at_risk > 0 ? "warn" : "muted"} />
        <Stat label="SLA breached" value={summary.sla_breached} tone={summary.sla_breached > 0 ? "danger" : "muted"} />
      </section>

      <Card>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Recent reports</h2>
          <Link href="/staff/inbox">
            <Button variant="ghost" size="sm">
              Open inbox →
            </Button>
          </Link>
        </header>
        {recent.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>No reports yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
            {recent.map((r, i) => (
              <li
                key={r.id}
                style={{
                  padding: "0.625rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <Link
                  href={`/staff/reports/${r.id}`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
                >
                  <span style={{ fontWeight: 500 }}>{r.title}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {r.category_label} · {r.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </StaffShell>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "muted" | "warn" | "danger";
}) {
  const colour =
    tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warning)" : tone === "muted" ? "var(--text-secondary)" : "var(--text-primary)";
  return (
    <Card style={{ padding: "1rem 1.25rem" }}>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <p className="tnum" style={{ margin: "0.25rem 0 0", fontSize: "1.875rem", fontWeight: 600, color: colour }}>
        {value}
      </p>
    </Card>
  );
}
