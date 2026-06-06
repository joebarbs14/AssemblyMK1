import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type ConcessionRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { HardshipForm } from "./HardshipForm";

export default async function HardshipPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const mine = await api<ConcessionRow[]>("/api/concessions/mine", { token });

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Hardship & concessions
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Apply for a pensioner rebate, hardship deferral, or other relief. Confidential.
      </p>

      <HardshipForm token={token} />

      {mine.length > 0 && (
        <Card style={{ marginTop: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Your applications</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {mine.map((c, i) => (
              <li key={c.id} style={{ padding: "0.625rem 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{c.kind}</span>
                  <span style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "var(--r-full)",
                    background: c.status === "approved" ? "var(--success-soft)" : c.status === "rejected" ? "var(--danger-soft)" : "var(--gold-soft)",
                    color: c.status === "approved" ? "var(--success)" : c.status === "rejected" ? "var(--danger)" : "var(--gold-deep)",
                    fontWeight: 600,
                  }}>
                    {c.status}
                  </span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {new Date(c.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
