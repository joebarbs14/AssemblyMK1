import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type RebateRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const CATEGORY_LABEL: Record<string, string> = {
  solar: "Solar",
  battery: "Battery",
  ev: "Electric vehicle",
  insulation: "Insulation",
  water_tank: "Water tank",
  e_bike: "E-bike",
  heat_pump: "Heat-pump hot water",
};

const LEVEL_COLOR: Record<string, string> = {
  federal: "#22303C",
  state: "#1d4ed8",
  council: "#C9A24B",
};

export default async function RebatesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<RebateRow[]>("/api/rebates", { token });

  const groups: Record<string, RebateRow[]> = {};
  for (const r of rows) (groups[r.category] ??= []).push(r);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Climate rebates
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Federal, NSW and council schemes for solar, batteries, EVs, water tanks and heat pumps.
        All in one place.
      </p>

      {Object.entries(groups).map(([cat, items]) => (
        <section key={cat} style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                       textTransform: "uppercase", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
            {CATEGORY_LABEL[cat] ?? cat}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((r) => (
              <li key={r.id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{r.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.875rem" }}>{r.description}</p>
                    </div>
                    <span style={{
                      padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                      background: LEVEL_COLOR[r.level] ?? "#6b7280", borderRadius: "var(--r-full)",
                      alignSelf: "flex-start",
                    }}>{r.level}</span>
                  </div>
                  {r.max_amount_cents && (
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.9375rem", fontWeight: 600 }}>
                      Up to <Money cents={r.max_amount_cents} />
                    </p>
                  )}
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    <strong>Eligible:</strong> {r.eligibility}
                  </p>
                  <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    {r.expires_on && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Expires {new Date(r.expires_on).toLocaleDateString()}
                      </span>
                    )}
                    {r.apply_url && (
                      <a href={r.apply_url} target="_blank" rel="noreferrer" style={{
                        fontSize: "0.8125rem", color: "var(--brand)", fontWeight: 600,
                      }}>Apply →</a>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
