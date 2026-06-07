import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type Me, type RateKpis, type RateKpisExt, type RatePropertyRollRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { RollFilter } from "./RollFilter";

interface PageProps {
  searchParams: Promise<{ q?: string; overdue?: string }>;
}

export default async function StaffRatesPage({ searchParams }: PageProps) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  const { q = "", overdue } = await searchParams;
  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (overdue === "true") params.set("overdue", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";

  const [kpis, kpisExt, roll] = await Promise.all([
    api<RateKpis>("/api/staff/rates/kpis", { token }),
    api<RateKpisExt>("/api/staff/rates/kpis-ext", { token }).catch(() =>
      ({ active_levies: 0, pending_certificates: 0, open_objections: 0, active_plans: 0 } as RateKpisExt),
    ),
    api<RatePropertyRollRow[]>(`/api/staff/rates/properties${qs}`, { token }),
  ]);

  return (
    <StaffShell me={me} active="rates">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Rates</h1>
        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
          <Link href="/staff/rates/calculator">Calculator →</Link>
          <Link href="/staff/rates/categories">Categories →</Link>
          <Link href="/staff/rates/levies">Levies →</Link>
          <Link href="/staff/rates/certificates">Certificates →</Link>
          <Link href="/staff/rates/plans">Plans →</Link>
          <Link href="/staff/rates/objections">Objections →</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "0.5rem", marginBottom: "1rem" }}>
        <Stat label="Properties" value={kpis.properties.toLocaleString()} />
        <Stat label="Outstanding"
          value={<Money cents={kpis.outstanding_cents} />} />
        <Stat label="Overdue accounts" value={kpis.overdue_accounts.toLocaleString()}
          danger={kpis.overdue_accounts > 0} />
        <Stat label={`FY${kpis.current_fy} categories`}
          value={kpis.active_categories_current_fy.toLocaleString()}
          danger={kpis.active_categories_current_fy === 0} />
        <Stat label="Active levies" value={kpisExt.active_levies.toLocaleString()} />
        <Stat label="Cert queue" value={kpisExt.pending_certificates.toLocaleString()}
          danger={kpisExt.pending_certificates > 5} />
        <Stat label="Open objections" value={kpisExt.open_objections.toLocaleString()} />
        <Stat label="Active plans" value={kpisExt.active_plans.toLocaleString()} />
      </div>

      <RollFilter defaultQ={q} defaultOverdue={overdue === "true"} />

      <Card style={{ padding: 0, overflow: "hidden", marginTop: "0.75rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={head}>
              <th style={cell}>Address</th>
              <th style={cell}>Type</th>
              <th style={cell}>Land m²</th>
              <th style={cell}>Latest UV</th>
              <th style={cell}>Account</th>
              <th style={{ ...cell, textAlign: "right" }}>Balance</th>
              <th style={cell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {roll.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={cell}>
                  <Link href={`/staff/rates/property/${r.id}`} style={{ fontWeight: 600 }}>
                    {r.address}
                  </Link>
                  {r.suburb && <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{r.suburb}</div>}
                </td>
                <td style={cell}>{r.property_type}</td>
                <td style={cell}>{r.land_size_sqm?.toLocaleString() ?? "—"}</td>
                <td style={cell}>{r.latest_uv_cents ? <Money cents={r.latest_uv_cents} /> : "—"}</td>
                <td style={{ ...cell, fontFamily: "monospace" }}>{r.account_number ?? "—"}</td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {r.balance_cents > 0 ? <Money cents={r.balance_cents} /> : "—"}
                </td>
                <td style={cell}>
                  {r.overdue && (
                    <span style={{
                      padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                      color: "#fff", background: "var(--danger)",
                      borderRadius: "var(--r-full)", textTransform: "uppercase",
                    }}>Overdue</span>
                  )}
                </td>
              </tr>
            ))}
            {roll.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...cell, color: "var(--text-secondary)", textAlign: "center" }}>
                  No properties match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </StaffShell>
  );
}

function Stat({ label, value, danger = false }: {
  label: string; value: React.ReactNode; danger?: boolean;
}) {
  return (
    <Card style={{ padding: "0.875rem 1rem" }}>
      <p style={{ margin: 0, fontSize: "0.6875rem", letterSpacing: "0.06em",
                   textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 600 }}>
        {label}
      </p>
      <p className="tnum" style={{
        margin: "0.25rem 0 0", fontSize: "1.5rem", fontWeight: 700,
        color: danger ? "var(--danger)" : undefined,
      }}>{value}</p>
    </Card>
  );
}

const cell: React.CSSProperties = { padding: "0.5rem 0.625rem", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = {
  background: "var(--surface-muted)", textTransform: "uppercase",
  fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)",
};
