import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type SurveyRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { SurveyAnswerer } from "./SurveyAnswerer";

export default async function SurveysPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<SurveyRow[]>("/api/surveys", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Surveys &amp; polls
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Tell us what you think. 30 seconds well spent.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No active surveys.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((s) => (
            <li key={s.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{s.title}</h2>
                  <span style={{
                    padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    background: "var(--surface-muted)", color: "var(--text-secondary)",
                    borderRadius: "var(--r-full)", alignSelf: "flex-start",
                  }}>{s.kind}</span>
                </div>
                {s.description && <p style={{ margin: "0.25rem 0", fontSize: "0.875rem" }}>{s.description}</p>}
                <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {s.response_count} responses{s.closes_at && ` · closes ${new Date(s.closes_at).toLocaleDateString()}`}
                </p>
                <SurveyAnswerer token={token} survey={s} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
