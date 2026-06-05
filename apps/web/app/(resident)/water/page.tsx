import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type PropertyListItem, type WaterRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function WaterPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const properties = await api<PropertyListItem[]>("/api/rates/properties", { token });
  if (properties.length === 0) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
        <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          ← Home
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.5rem" }}>Water</h1>
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Link a property in <Link href="/rates">Rates</Link> to see your water consumption.
          </p>
        </Card>
      </main>
    );
  }

  // First property is good enough for v1; multi-property tabs in M11.x.
  const prop = properties[0];
  const rows = await api<WaterRow[]>(`/api/water/properties/${prop.id}`, { token });
  const max = Math.max(...rows.map((r) => r.consumed_litres), 1);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>Water</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>{prop.address}</p>

      {rows.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No quarterly readings on file yet.</p>
        </Card>
      ) : (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Quarterly consumption</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rows.map((r) => {
              const pct = Math.round((r.consumed_litres / max) * 100);
              const overAllowance =
                r.allocated_litres != null && r.consumed_litres > r.allocated_litres;
              return (
                <li
                  key={r.quarter_start}
                  style={{
                    padding: "0.75rem 0",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem" }} className="tnum">
                      {new Date(r.quarter_start).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: overAllowance ? "var(--danger)" : "var(--text-primary)",
                      }}
                      className="tnum"
                    >
                      {(r.consumed_litres / 1000).toFixed(1)} kL
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      height: 8,
                      background: "var(--surface-muted)",
                      borderRadius: "var(--r-full)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: overAllowance ? "var(--danger)" : "var(--brand)",
                        transition: "width var(--d-std) var(--ease-in)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <span>
                      {r.allocated_litres != null
                        ? `Allowance: ${(r.allocated_litres / 1000).toFixed(0)} kL`
                        : "No allowance set"}
                    </span>
                    {r.amount_owing_cents > 0 && (
                      <span>
                        <Money cents={r.amount_owing_cents} />
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </main>
  );
}
