import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type PanelRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { ExpressButton } from "./ExpressButton";

export default async function PanelsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<PanelRow[]>("/api/panels", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Citizen panels
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Big decisions deserve more than a vote. Express interest — panels are drawn at random
        from the pool to be demographically representative.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No panels currently recruiting.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((p) => (
            <li key={p.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{p.title}</h2>
                  <span style={{
                    padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    background: "var(--surface-muted)", color: "var(--text-secondary)",
                    borderRadius: "var(--r-full)", alignSelf: "flex-start",
                  }}>{p.status}</span>
                </div>
                <p style={{ margin: "0.5rem 0", fontSize: "0.875rem" }}>{p.description}</p>
                <p style={{ margin: "0.5rem 0", fontSize: "0.875rem", fontStyle: "italic", color: "var(--brand)" }}>
                  &ldquo;{p.question}&rdquo;
                </p>
                <p style={{ margin: "0.5rem 0 0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Deliberates {new Date(p.deliberates_at).toLocaleDateString()} · panel of {p.target_size}
                </p>
                <ExpressButton token={token} panelId={p.id}
                  expressed={p.expressed} selected={p.selected}
                  recruiting={p.status === "recruiting"} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
