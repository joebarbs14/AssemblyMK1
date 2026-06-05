import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type GrantDraftRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { GrantDrafter } from "./GrantDrafter";

export default async function GrantsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const drafts = await api<GrantDraftRow[]>("/api/grants/mine", { token });

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
