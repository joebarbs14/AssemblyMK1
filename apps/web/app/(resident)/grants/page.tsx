import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type GrantDraftRow, type GrantOpportunityRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { GrantDrafter } from "./GrantDrafter";

export default async function GrantsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const [drafts, opportunities] = await Promise.all([
    api<GrantDraftRow[]>("/api/grants/mine", { token }),
    api<GrantOpportunityRow[]>("/api/grants/opportunities", { token }).catch(() => [] as GrantOpportunityRow[]),
  ]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Grant writer
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Generate a structured first draft for community grants. Edit then submit. 100% FOSS template;
        plug in a local Ollama LLM for richer drafts.
      </p>

      <GrantDrafter token={token} />

      {opportunities.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Open opportunities</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {opportunities.map((o) => (
              <li key={o.id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{o.title}</p>
                      <p style={{
                        margin: "2px 0 0", fontSize: "0.7rem", textTransform: "uppercase",
                        letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600,
                      }}>{o.source}</p>
                    </div>
                    {(o.min_amount_cents || o.max_amount_cents) && (
                      <p style={{ margin: 0, textAlign: "right", fontSize: "0.875rem" }}>
                        {o.min_amount_cents && <Money cents={o.min_amount_cents} />}
                        {o.min_amount_cents && o.max_amount_cents && " – "}
                        {o.max_amount_cents && <Money cents={o.max_amount_cents} />}
                      </p>
                    )}
                  </div>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>{o.description}</p>
                  {o.eligibility && (
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      <strong>Eligible:</strong> {o.eligibility}
                    </p>
                  )}
                  <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    {o.closes_at && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Closes {new Date(o.closes_at).toLocaleDateString()}
                      </span>
                    )}
                    {o.url && (
                      <a href={o.url} target="_blank" rel="noreferrer" style={{
                        fontSize: "0.8125rem", color: "var(--brand)", fontWeight: 600,
                      }}>Apply →</a>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {drafts.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Your drafts</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {drafts.map((g) => (
              <li key={g.id}>
                <Card>
                  <p style={{ margin: 0, fontWeight: 600 }}>{g.title}</p>
                  {g.grant_name && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      Target: {g.grant_name}
                    </p>
                  )}
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.8125rem", color: "var(--brand)" }}>
                      Show draft
                    </summary>
                    <pre style={{
                      marginTop: "0.5rem",
                      padding: "0.875rem",
                      background: "var(--surface-muted)",
                      borderRadius: "var(--r-md)",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.8125rem",
                      fontFamily: "inherit",
                      maxHeight: 360,
                      overflow: "auto",
                    }}>{g.draft_markdown}</pre>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
