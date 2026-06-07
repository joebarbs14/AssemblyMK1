import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import {
  api,
  type WaterDashboard,
  type WaterQualityRow,
  type WaterRebateClaimRow,
  type WaterRebateScheme,
} from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { BillEstimator } from "./BillEstimator";
import { RebateRequest } from "./RebateRequest";
import { SelfReadForm } from "./SelfReadForm";

const RESTRICTION_COLOR: Record<number, string> = {
  0: "#047857",
  1: "#22c55e",
  2: "#C9A24B",
  3: "#f97316",
  4: "#dc2626",
  5: "#991b1b",
};

export default async function WaterPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const [dash, quality, schemes, claims] = await Promise.all([
    api<WaterDashboard>("/api/water/dashboard", { token }),
    api<WaterQualityRow[]>("/api/water/quality?days=14", { token }).catch(() => [] as WaterQualityRow[]),
    api<WaterRebateScheme[]>("/api/water/rebates", { token }).catch(() => [] as WaterRebateScheme[]),
    api<WaterRebateClaimRow[]>("/api/water/rebates/mine", { token }).catch(() => [] as WaterRebateClaimRow[]),
  ]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.5rem" }}>Water</h1>

      <Card style={{
        marginBottom: "1rem",
        background: RESTRICTION_COLOR[dash.restriction.level] ?? "#6b7280",
        color: "#fff", border: "none",
      }}>
        <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.9 }}>
          WATER RESTRICTIONS · LEVEL {dash.restriction.level}
        </p>
        <h2 style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.125rem", fontWeight: 700 }}>
          {dash.restriction.summary}
        </h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem", opacity: 0.95 }}>
          {dash.restriction.rules.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </Card>

      {dash.properties.map((p) => (
        <Card key={p.id} style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>{p.address}</h2>
          {p.allocation ? (
            <>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Season {p.allocation.season_year} · {p.allocation.entitlement_ml} ML entitlement ·
                {" "}{p.allocation.allocation_pct}% allocation
              </p>
              <div style={{ height: 12, background: "var(--surface-muted)",
                             borderRadius: "var(--r-full)", overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, (p.allocation.used_kl / Math.max(1, p.allocation.opening_kl)) * 100)}%`,
                  height: "100%",
                  background: p.allocation.used_kl > p.allocation.opening_kl
                    ? "var(--danger)" : "var(--brand)",
                }} />
              </div>
              <p style={{ margin: "0.375rem 0 0", fontSize: "0.875rem" }}>
                Used <strong>{p.allocation.used_kl.toLocaleString()} kL</strong> of{" "}
                <strong>{p.allocation.opening_kl.toLocaleString()} kL</strong>{" · "}
                <span style={{ color: "var(--text-secondary)" }}>
                  {p.allocation.remaining_kl.toLocaleString()} kL remaining
                </span>
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              No allocation set for this season.
            </p>
          )}
          {p.last_meter_at && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Last meter read: {p.last_meter_kl?.toLocaleString()} kL ·{" "}
              {new Date(p.last_meter_at).toLocaleDateString()}
            </p>
          )}
          <SelfReadForm token={token} propertyId={p.id} />
        </Card>
      ))}

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Bill estimator</h2>
        <BillEstimator token={token} />
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>
          Section 68 — water, sewer, stormwater
        </h2>
        <p style={{ margin: "0 0 0.625rem", fontSize: "0.875rem",
                     color: "var(--text-secondary)" }}>
          Council approval to carry out water, sewer or stormwater work — Part B
          of s68 of the Local Government Act. Starts here; sub-forms (like the
          flow-rate test) attach automatically.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/section-68?part=B&new_build=1" style={{
            display: "inline-block",
            padding: "0.5rem 0.875rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#fff",
            background: "var(--text-primary)",
            borderRadius: "var(--r-md)",
            textDecoration: "none",
          }}>
            New build → start s68 →
          </Link>
          <Link href="/section-68?part=B" style={{
            display: "inline-block",
            padding: "0.5rem 0.875rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "var(--surface-muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            textDecoration: "none",
          }}>
            Browse Part B activities
          </Link>
          <Link href="/water/flow-rate-test" style={{
            display: "inline-block",
            padding: "0.5rem 0.875rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "var(--surface-muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            textDecoration: "none",
          }}>
            Flow rate test (WS-FO-206)
          </Link>
        </div>
      </Card>

      {dash.sources.length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Council water sources</h2>
          {dash.sources.map((s) => (
            <div key={s.id} style={{ marginTop: "0.625rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span><strong>{s.name}</strong> <span style={{ color: "var(--text-secondary)" }}>· {s.kind}</span></span>
                <span style={{ fontWeight: 600 }}>{s.capacity_pct?.toFixed(1)}%</span>
              </div>
              <div style={{ height: 8, background: "var(--surface-muted)",
                             borderRadius: "var(--r-full)", overflow: "hidden", marginTop: "0.25rem" }}>
                <div style={{
                  width: `${Math.min(100, s.capacity_pct ?? 0)}%`,
                  height: "100%",
                  background: (s.capacity_pct ?? 0) < 30 ? "var(--danger)"
                    : (s.capacity_pct ?? 0) < 60 ? "#C9A24B" : "#047857",
                }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {quality.length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>
            Drinking-water quality (last 14 days)
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left",
                            fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <th style={{ padding: "0.25rem 0.375rem" }}>Point</th>
                <th style={{ padding: "0.25rem 0.375rem" }}>When</th>
                <th style={{ padding: "0.25rem 0.375rem" }}>Cl</th>
                <th style={{ padding: "0.25rem 0.375rem" }}>pH</th>
                <th style={{ padding: "0.25rem 0.375rem" }}>NTU</th>
                <th style={{ padding: "0.25rem 0.375rem" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {quality.slice(0, 8).map((q) => (
                <tr key={q.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.375rem" }}>{q.sample_point}</td>
                  <td style={{ padding: "0.375rem", color: "var(--text-secondary)" }}>
                    {new Date(q.taken_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.375rem" }}>{q.chlorine_mg_per_l?.toFixed(2) ?? "—"}</td>
                  <td style={{ padding: "0.375rem" }}>{q.ph?.toFixed(1) ?? "—"}</td>
                  <td style={{ padding: "0.375rem" }}>{q.turbidity_ntu?.toFixed(1) ?? "—"}</td>
                  <td style={{ padding: "0.375rem" }}>
                    <span style={{
                      padding: "0.0625rem 0.375rem", fontSize: "0.65rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                      background: q.compliance === "pass" ? "#047857"
                        : q.compliance === "borderline" ? "#C9A24B" : "#dc2626",
                      borderRadius: "var(--r-full)",
                    }}>{q.compliance}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {schemes.length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Water-saving rebates</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex",
                       flexDirection: "column", gap: "0.5rem" }}>
            {schemes.map((s) => (
              <li key={s.id}>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.625rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{s.label}</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>up to <Money cents={s.max_amount_cents} /></p>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>{s.description}</p>
                  {dash.properties[0] && (
                    <RebateRequest token={token} propertyId={dash.properties[0].id} scheme={s} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {claims.length > 0 && (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Your rebate claims</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {claims.map((c) => (
              <li key={c.id} style={{ display: "flex", justifyContent: "space-between",
                                       padding: "0.375rem 0", fontSize: "0.875rem",
                                       borderTop: "1px solid var(--border)" }}>
                <span>{c.scheme_label}</span>
                <span>
                  <Money cents={c.claim_amount_cents} />
                  <span style={{ marginLeft: "0.5rem", padding: "0.125rem 0.5rem",
                                  fontSize: "0.7rem", fontWeight: 700,
                                  textTransform: "uppercase", color: "#fff",
                                  background: c.status === "approved" || c.status === "paid"
                                    ? "#047857" : c.status === "rejected" ? "#dc2626" : "#C9A24B",
                                  borderRadius: "var(--r-full)" }}>{c.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
