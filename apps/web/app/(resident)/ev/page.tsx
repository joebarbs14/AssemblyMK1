import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type EvChargerRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function EvPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<EvChargerRow[]>("/api/ev/chargers", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        EV chargers
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council and partner chargers across the shire. Book a slot at council chargers.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No chargers listed.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((c) => (
            <li key={c.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {c.address}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>
                      <strong>{c.kw} kW</strong> · {c.plug_type.toUpperCase()} · ${(c.cents_per_kwh / 100).toFixed(2)}/kWh
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.7rem", textTransform: "uppercase",
                                letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {c.operator}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
                    <span style={{
                      padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      color: c.available ? "#fff" : "var(--text-secondary)",
                      background: c.available ? "#047857" : "var(--surface-muted)",
                      borderRadius: "var(--r-full)",
                    }}>{c.available ? "Available" : "In use"}</span>
                    {c.bookable && (
                      <Link
                        href={`/ev/${c.id}`}
                        style={{ fontSize: "0.8125rem", color: "var(--brand)", fontWeight: 600 }}
                      >Book slot →</Link>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
