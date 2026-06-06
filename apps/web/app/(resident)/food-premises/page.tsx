import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type FoodPremisesRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const GRADE_COLOR: Record<string, string> = {
  A: "#047857",
  B: "#C9A24B",
  C: "#dc2626",
  F: "#991b1b",
};

export default async function FoodPremisesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<FoodPremisesRow[]>("/api/food-premises", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Food premises hygiene
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council inspections under FSANZ. A = excellent, B = good, C = some issues, F = closed.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No premises listed.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((p) => (
            <li key={p.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{p.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {p.kind} · {p.address}
                    </p>
                    {p.latest_inspection && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Last inspected {new Date(p.latest_inspection).toLocaleDateString()} · score {p.latest_score}
                      </p>
                    )}
                  </div>
                  {p.latest_grade && (
                    <div style={{
                      width: 44, height: 44, borderRadius: "var(--r-md)",
                      background: GRADE_COLOR[p.latest_grade] ?? "#6b7280", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: "1.5rem",
                    }}>{p.latest_grade}</div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
