import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type DARow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  submitted: { bg: "var(--info-soft)", fg: "var(--info)" },
  under_review: { bg: "var(--info-soft)", fg: "var(--info)" },
  on_exhibition: { bg: "var(--gold-soft)", fg: "var(--gold-deep)" },
  approved: { bg: "var(--success-soft)", fg: "var(--success)" },
  rejected: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  withdrawn: { bg: "var(--surface-muted)", fg: "var(--text-secondary)" },
};

export default async function DevelopmentPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const das = await api<DARow[]>("/api/development", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Development applications
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Public register of current and recent applications in your shire.
      </p>

      {das.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No applications on the register.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {das.map((d) => {
            const tone = STATUS_TONE[d.status] ?? STATUS_TONE.submitted;
            return (
              <li key={d.id}>
                <Card style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9375rem" }} className="tnum">
                      {d.da_number}
                    </p>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "2px 8px",
                        borderRadius: "var(--r-full)",
                        background: tone.bg,
                        color: tone.fg,
                      }}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>{d.application_type}</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>{d.description}</p>
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "flex",
                      gap: 12,
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Submitted{" "}
                      {new Date(d.submission_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {d.estimated_cost_cents != null && d.estimated_cost_cents > 0 && (
                      <span>
                        Est. <Money cents={d.estimated_cost_cents} />
                      </span>
                    )}
                    {d.exhibition_ends_at && (
                      <span style={{ color: "var(--gold-deep)", fontWeight: 600 }}>
                        On exhibition until{" "}
                        {new Date(d.exhibition_ends_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
