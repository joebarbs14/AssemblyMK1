import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type JobRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const KIND_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  casual: "Casual",
  contract: "Contract",
  work_experience: "Work experience",
  grad: "Graduate",
};

export default async function JobsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<JobRow[]>("/api/jobs", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Jobs board
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council roles, partner businesses, work-experience placements.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No open roles.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((j) => (
            <li key={j.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{j.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {j.employer}{j.location && ` · ${j.location}`}
                    </p>
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                      <span style={{
                        padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 600,
                        background: j.is_council ? "var(--brand)" : "var(--surface-muted)",
                        color: j.is_council ? "var(--brand-fg)" : "var(--text-primary)",
                        borderRadius: "var(--r-full)",
                      }}>{j.is_council ? "Council" : "Partner"}</span>
                      <span style={{
                        padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 600,
                        background: "var(--surface-muted)", color: "var(--text-secondary)",
                        borderRadius: "var(--r-full)",
                      }}>{KIND_LABEL[j.kind] ?? j.kind}</span>
                    </div>
                  </div>
                  {(j.salary_min_cents || j.salary_max_cents) && (
                    <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "right" }}>
                      {j.salary_min_cents && <Money cents={j.salary_min_cents} />}
                      {j.salary_min_cents && j.salary_max_cents && " – "}
                      {j.salary_max_cents && <Money cents={j.salary_max_cents} />}
                    </p>
                  )}
                </div>
                <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem" }}>{j.description}</p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Posted {new Date(j.posted_at).toLocaleDateString()}
                  {j.closes_at && ` · closes ${new Date(j.closes_at).toLocaleDateString()}`}
                </p>
                {j.apply_url && (
                  <a href={j.apply_url} target="_blank" rel="noreferrer" style={{
                    display: "inline-block", marginTop: "0.5rem", fontSize: "0.8125rem",
                    color: "var(--brand)", fontWeight: 600,
                  }}>Apply →</a>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
