import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type PetitionRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { PetitionStarter } from "./PetitionStarter";
import { SignButton } from "./SignButton";

export default async function PetitionsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<PetitionRow[]>("/api/petitions", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Petitions
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Start a petition or sign one. Verified residents only. Reach the threshold and council must
        formally respond at the next meeting.
      </p>

      <PetitionStarter token={token} />

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Live petitions</h2>
      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None yet — start one above.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((p) => {
            const pct = Math.min(100, (p.signature_count / p.threshold) * 100);
            return (
              <li key={p.id}>
                <Card>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{p.title}</h3>
                  <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.875rem" }}>{p.summary}</p>
                  <p style={{ margin: "0.5rem 0", fontSize: "0.875rem", fontStyle: "italic", color: "var(--brand)" }}>
                    Ask: {p.ask}
                  </p>
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ height: 8, background: "var(--surface-muted)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#047857" : "var(--brand)" }} />
                    </div>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {p.signature_count} / {p.threshold} signatures
                      {p.status !== "open" && <> · <strong style={{ textTransform: "uppercase" }}>{p.status}</strong></>}
                    </p>
                  </div>
                  {p.council_response && (
                    <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "var(--surface-muted)",
                                   borderLeft: "3px solid var(--brand)", borderRadius: "var(--r-sm)" }}>
                      <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em",
                                  textTransform: "uppercase", color: "var(--text-secondary)" }}>Council response</p>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>{p.council_response}</p>
                    </div>
                  )}
                  <div style={{ marginTop: "0.75rem" }}>
                    <SignButton token={token} petitionId={p.id} signed={p.signed} canSign={p.status === "open"} />
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
