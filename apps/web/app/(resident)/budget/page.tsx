import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type BudgetData, type CapitalProjectRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const CATEGORY_TONE: Record<string, string> = {
  roads: "#22303C",
  waste: "#C9A24B",
  parks: "#067647",
  libraries: "#2C6DA8",
  governance: "#5A6975",
  community: "#9E7E32",
  planning: "#1A242E",
  environment: "#067647",
  water: "#2C6DA8",
  other: "#8A96A1",
};

export default async function BudgetPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const [budget, projects] = await Promise.all([
    api<BudgetData>("/api/budget", { token }),
    api<CapitalProjectRow[]>("/api/budget/capital-projects", { token }),
  ]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Where your rates go
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council budget {budget.fiscal_year} — full breakdown of expense by service area.
      </p>

      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", fontWeight: 600 }}>
              Total expense
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "1.75rem", fontWeight: 700 }}>
              <Money cents={budget.total_expense_cents} />
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", fontWeight: 600 }}>
              Total revenue
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              <Money cents={budget.total_revenue_cents} />
            </p>
          </div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {budget.by_category.map((c) => {
            const pct = Math.round((c.expense_cents / Math.max(1, budget.total_expense_cents)) * 100);
            return (
              <li key={c.category} style={{ padding: "0.5rem 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                    {c.label}
                  </span>
                  <span style={{ fontWeight: 600 }} className="tnum">
                    <Money cents={c.expense_cents} /> · {pct}%
                  </span>
                </div>
                <div aria-hidden="true" style={{ height: 6, background: "var(--surface-muted)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: CATEGORY_TONE[c.category] ?? "var(--brand)" }} />
                </div>
                {c.prior_year_expense_cents != null && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                    Prior year: <Money cents={c.prior_year_expense_cents} />
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "1.5rem 0 0.75rem" }}>
        Capital projects {budget.fiscal_year}
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {projects.map((p) => (
          <li key={p.id}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{p.title}</p>
                <span style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "2px 8px",
                  borderRadius: "var(--r-full)",
                  background: p.status === "completed" ? "var(--success-soft)" : "var(--gold-soft)",
                  color: p.status === "completed" ? "var(--success)" : "var(--gold-deep)",
                }}>
                  {p.status.replace("_", " ")}
                </span>
              </div>
              <div aria-hidden="true" style={{ marginTop: 6, height: 4, background: "var(--surface-muted)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${p.progress_pct}%`, background: "var(--brand)" }} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <Money cents={p.spent_cents} /> spent of <Money cents={p.budget_cents} /> · {p.progress_pct}% complete
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
