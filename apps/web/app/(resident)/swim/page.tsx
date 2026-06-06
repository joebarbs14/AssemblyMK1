import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type SwimSiteRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const GRADE_COLOR: Record<string, string> = {
  good: "#047857",
  fair: "#C9A24B",
  poor: "#dc2626",
  closed: "#991b1b",
};

const STATUS_COLOR: Record<string, string> = {
  open: "#047857",
  caution: "#C9A24B",
  closed: "#dc2626",
};

export default async function SwimPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<SwimSiteRow[]>("/api/swim-sites", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Swim conditions
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Beaches, pools, rivers — water quality, temperature, closures. Updated through the day.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No sites listed.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((s) => (
            <li key={s.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{s.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", textTransform: "uppercase",
                                letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {s.kind}
                    </p>
                    {s.address && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {s.address}
                      </p>
                    )}
                    {s.latest_temp_c !== null && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
                        Water <strong>{s.latest_temp_c.toFixed(1)}°C</strong>
                        {s.latest_taken_at && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {" "}({new Date(s.latest_taken_at).toLocaleString()})
                        </span>}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
                    <span style={{
                      padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                      background: STATUS_COLOR[s.status] ?? "#6b7280",
                      borderRadius: "var(--r-full)",
                    }}>{s.status}</span>
                    {s.latest_grade && (
                      <span style={{
                        padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                        color: GRADE_COLOR[s.latest_grade] ?? "#6b7280",
                      }}>{s.latest_grade}</span>
                    )}
                  </div>
                </div>
                {s.facilities && (
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {s.facilities.join(" · ")}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
