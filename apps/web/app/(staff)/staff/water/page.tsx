import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { Card } from "@/components/ui/Card";
import { api, type LeakAlertRow, type Me, type WaterKpis } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function StaffWaterPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const [kpis, leaks] = await Promise.all([
    api<WaterKpis>("/api/staff/water/kpis", { token }),
    api<LeakAlertRow[]>("/api/staff/water/leaks?severity=suspected", { token }).catch(() => [] as LeakAlertRow[]),
  ]);

  return (
    <StaffShell me={me} active="water">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Water</h1>
        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
          <Link href="/staff/water/tariffs">Tariffs →</Link>
          <Link href="/staff/water/restrictions">Restrictions →</Link>
          <Link href="/staff/water/quality">Quality →</Link>
          <Link href="/staff/water/sources">Sources →</Link>
          <Link href="/staff/water/leaks">Leaks →</Link>
          <Link href="/staff/water/self-reads">Self-reads →</Link>
          <Link href="/staff/water/rebates">Rebates →</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "0.5rem", marginBottom: "1rem" }}>
        <Stat label={`FY${kpis.current_fy} tariff tiers`}
          value={kpis.active_tariff_tiers_current_fy}
          danger={kpis.active_tariff_tiers_current_fy === 0} />
        <Stat label="Open leaks" value={kpis.open_leaks} danger={kpis.open_leaks > 0} />
        <Stat label="Pending reads" value={kpis.pending_self_reads}
          danger={kpis.pending_self_reads > 10} />
        <Stat label="Rebate queue" value={kpis.pending_rebate_claims} />
        <Stat label="Failed samples" value={kpis.fail_samples_total}
          danger={kpis.fail_samples_total > 0} />
      </div>

      <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text-secondary)",
                    margin: "1rem 0 0.5rem" }}>
        Suspected leak alerts
      </h2>
      {leaks.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>
          No active leak alerts.
        </p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0,
                     display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {leaks.slice(0, 5).map((l) => (
            <li key={l.id}>
              <Card>
                <p style={{ margin: 0, fontWeight: 600 }}>{l.address}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {l.flow_lph.toFixed(0)} L/h sustained · baseline {l.baseline_lph.toFixed(0)} L/h ·
                  detected {new Date(l.detected_at).toLocaleString()}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </StaffShell>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card style={{ padding: "0.875rem 1rem" }}>
      <p style={{ margin: 0, fontSize: "0.6875rem", letterSpacing: "0.06em",
                   textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 600 }}>
        {label}
      </p>
      <p className="tnum" style={{
        margin: "0.25rem 0 0", fontSize: "1.5rem", fontWeight: 700,
        color: danger ? "var(--danger)" : undefined,
      }}>{value.toLocaleString()}</p>
    </Card>
  );
}
