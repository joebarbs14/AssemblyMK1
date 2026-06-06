import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type ClimateMetricRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function ClimatePage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const metrics = await api<ClimateMetricRow[]>("/api/climate", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Climate & sustainability
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        How council is tracking against its sustainability targets.
      </p>

      {metrics.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>No metrics published yet.</p>
        </Card>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {metrics.map((m) => {
            const pct =
              m.target != null && m.target !== 0
                ? Math.min(100, Math.round((m.value / m.target) * 100))
                : null;
            const reducing = m.key === "emissions_t"; // lower is better
            const onTrack = pct != null && (reducing ? m.value <= m.target! * 1.2 : m.value >= m.target! * 0.7);
            return (
              <li key={m.key}>
                <Card style={{ padding: "1.25rem" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {m.label}
                  </p>
                  <p className="tnum" style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.75rem", fontWeight: 700 }}>
                    {Math.round(m.value).toLocaleString("en-AU")}{" "}
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                      {m.unit}
                    </span>
                  </p>
                  {m.target != null && (
                    <>
                      <div
                        aria-hidden="true"
                        style={{
                          height: 6,
                          background: "var(--surface-muted)",
                          borderRadius: "var(--r-full)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct ?? 0}%`,
                            background: onTrack ? "var(--success)" : "var(--gold)",
                          }}
                        />
                      </div>
                      <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Target: {Math.round(m.target).toLocaleString("en-AU")} {m.unit}
                        {m.target_year ? ` by ${m.target_year}` : ""}
                      </p>
                    </>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
