import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, type Me, type PropertyListItem, type ReportListItem } from "@/lib/api";
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

  // Fetch dashboard data in parallel; tolerate empty results.
  const [reports, properties] = await Promise.all([
    api<ReportListItem[]>("/api/reports", { token }).catch(() => [] as ReportListItem[]),
    api<PropertyListItem[]>("/api/rates/properties", { token }).catch(() => [] as PropertyListItem[]),
  ]);

  const openReports = reports.filter(
    (r) => !["resolved", "closed", "duplicate", "rejected"].includes(r.status),
  );
  const recent = reports.slice(0, 3);
  const isEmpty = reports.length === 0 && properties.length === 0;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          {me.council.name}
        </p>
        <h1 style={{ fontSize: "1.75rem", margin: "0.25rem 0 0", fontWeight: 600 }}>
          Hi {me.name ?? me.email}
        </h1>
      </header>

      {/* Primary CTA */}
      <Card style={{ marginBottom: "1rem", background: "var(--brand)", color: "var(--brand-fg)", border: "none" }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
          See something that needs council attention?
        </h2>
        <p style={{ margin: "0.25rem 0 1rem", opacity: 0.9 }}>
          Pothole, broken streetlight, illegal dumping — we'll route it to the right team.
        </p>
        <Link href="/reports/new">
          <Button variant="secondary" size="lg">
            Report an issue →
          </Button>
        </Link>
      </Card>

      {isEmpty && <TryDemoPanel />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: "1rem",
        }}
      >
        <Stat label="Open reports" value={openReports.length} href="/reports" />
        <Stat label="Properties" value={properties.length} href="/rates" />
        <Stat
          label="Total balance"
          value={
            properties.reduce((acc, p) => acc + (p.account?.balance_cents ?? 0), 0) > 0
              ? `$${(properties.reduce((acc, p) => acc + (p.account?.balance_cents ?? 0), 0) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "$0.00"
          }
          href="/rates"
        />
      </div>

      {recent.length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "0.75rem",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Recent reports</h2>
            <Link href="/reports" style={{ fontSize: "0.8125rem" }}>
              See all →
            </Link>
          </header>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recent.map((r, i) => (
              <li
                key={r.id}
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", padding: "0.625rem 0" }}
              >
                <Link
                  href={`/reports/${r.id}`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit", gap: 8 }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title}
                  </span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Council shortcuts</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "0.5rem" }}>
          <Link href="/reports/new">
            <Button variant="secondary" size="sm">
              New report
            </Button>
          </Link>
          <Link href="/rates">
            <Button variant="secondary" size="sm">
              Rates
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="ghost" size="sm">
              My account
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

function Stat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Card style={{ padding: "1rem 1.25rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          {label}
        </p>
        <p className="tnum" style={{ margin: "0.25rem 0 0", fontSize: "1.75rem", fontWeight: 600 }}>
          {value}
        </p>
      </Card>
    </Link>
  );
}
