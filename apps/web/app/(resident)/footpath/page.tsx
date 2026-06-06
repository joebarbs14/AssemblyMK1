import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type FootpathAuditRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { FootpathReporter } from "./FootpathReporter";

const GRADE_COLOR: Record<string, string> = {
  good: "#047857",
  fair: "#C9A24B",
  poor: "#dc2626",
  impassable: "#991b1b",
};

export default async function FootpathPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<FootpathAuditRow[]>("/api/footpath/audits", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Footpath audit
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Help us map every kerb, crack and missing ramp. Especially useful for parents with prams
        and people who use wheelchairs or walking aids.
      </p>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Log a footpath issue</h2>
        <FootpathReporter token={token} />
      </Card>

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>
        Recent audits ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None logged yet.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {rows.slice(0, 20).map((a) => (
            <li key={a.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>
                      {a.issue.replace("_", " ")} · {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                    </p>
                    {a.notes && (
                      <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {a.notes}
                      </p>
                    )}
                  </div>
                  <span style={{
                    padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                    textTransform: "uppercase", color: "#fff",
                    background: GRADE_COLOR[a.grade] ?? "#6b7280",
                    borderRadius: "var(--r-full)", alignSelf: "flex-start",
                  }}>{a.grade}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
