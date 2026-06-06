import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type VolunteerOpportunityRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { VolunteerSignup } from "./VolunteerSignup";

export default async function VolunteerPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<VolunteerOpportunityRow[]>("/api/volunteer/opportunities", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Volunteer
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council needs your help. One-tap sign up — we&apos;ll roster you and send reminders.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No open opportunities.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((o) => (
            <li key={o.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{o.title}</h2>
                  {o.spots_remaining !== null && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {o.spots_remaining} spots left
                    </span>
                  )}
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {new Date(o.starts_at).toLocaleString()} → {new Date(o.ends_at).toLocaleString()}
                  {o.location && ` · ${o.location}`}
                </p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>{o.description}</p>
                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                  {o.skills_needed.map((s) => (
                    <span key={s} style={{
                      fontSize: "0.7rem", padding: "0.125rem 0.5rem",
                      background: "var(--surface-muted)", borderRadius: "var(--r-full)",
                      color: "var(--text-secondary)",
                    }}>{s}</span>
                  ))}
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <VolunteerSignup token={token} opportunityId={o.id} alreadySignedUp={o.signed_up} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
