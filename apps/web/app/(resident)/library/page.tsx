import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type LibraryItemRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LibraryItemCard } from "./LibraryItemCard";
import { LibrarySearch } from "./LibrarySearch";

interface PageProps { searchParams: Promise<{ q?: string }> }

export default async function LibraryPage({ searchParams }: PageProps) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { q = "" } = await searchParams;
  const rows = await api<LibraryItemRow[]>(`/api/library/search?q=${encodeURIComponent(q)}`, { token });
  const holds = await api<Array<{ hold_id: number; title: string; status: string; kind: string; ready_at: string | null }>>("/api/library/mine", { token }).catch(() => []);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Library
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Search the catalogue, place holds, pick up at the desk.
      </p>

      <LibrarySearch defaultQuery={q} />

      {holds.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Your holds</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {holds.map((h) => (
              <li key={h.hold_id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{h.title}</p>
                    <span style={{
                      padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      borderRadius: "var(--r-full)",
                      background: h.status === "ready" ? "#047857" : "var(--surface-muted)",
                      color: h.status === "ready" ? "#fff" : "var(--text-secondary)",
                    }}>{h.status}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>
        {q ? `Results for "${q}"` : "Recently added"}
      </h2>
      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No matches.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((i) => (
            <li key={i.id}>
              <LibraryItemCard token={token} item={i} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
