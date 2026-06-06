import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type DumpingHotspotRow, type SlaPredictionRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const RISK_COLOR: Record<string, string> = {
  breached: "#991b1b",
  high: "#dc2626",
  medium: "#C9A24B",
  low: "#047857",
};

export default async function PredictionsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const [sla, dumping] = await Promise.all([
    api<SlaPredictionRow[]>("/api/staff/predictions/sla-risk", { token }).catch(() => [] as SlaPredictionRow[]),
    api<DumpingHotspotRow[]>("/api/staff/predictions/dumping-hotspots", { token }).catch(() => [] as DumpingHotspotRow[]),
  ]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/staff" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Staff console</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Predictions
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem" }}>
        Rule-based heuristics today. Swap to a local scikit-learn model when you have a year of data.
      </p>

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>SLA risk (next 48h)</h2>
      {sla.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No reports at risk.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sla.map((r) => (
            <li key={r.report_id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0 }}>
                      <Link href={`/staff/reports/${r.report_id}`} style={{ fontWeight: 600 }}>
                        #{r.report_id} {r.title}
                      </Link>
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {r.category} · {r.status}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>{r.rationale}</p>
                  </div>
                  <span style={{
                    padding: "0.25rem 0.625rem",
                    background: RISK_COLOR[r.risk] ?? "#6b7280",
                    color: "#fff",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderRadius: "var(--r-full)",
                  }}>{r.risk}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Illegal dumping hotspots</h2>
      {dumping.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No clusters detected.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {dumping.map((h, i) => (
            <li key={i}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {h.lat.toFixed(3)}, {h.lng.toFixed(3)}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem" }}>{h.prediction}</p>
                  </div>
                  <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{h.incidents}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
