import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type SearchResults } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

interface PageProps { searchParams: Promise<{ q?: string }> }

export default async function SearchPage({ searchParams }: PageProps) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { q = "" } = await searchParams;

  let results: SearchResults | null = null;
  if (q.length >= 2) {
    results = await api<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`, { token });
  }

  const totalHits = results?.groups.reduce((n, g) => n + g.items.length, 0) ?? 0;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>Search</h1>

      <form method="GET" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <input name="q" defaultValue={q} placeholder="Reports, FAQ, businesses, tenders…"
          style={{
            flex: 1, padding: "0.625rem 0.75rem", fontSize: "0.9375rem",
            border: "1px solid var(--border)", borderRadius: "var(--r-md)",
            fontFamily: "inherit",
          }} />
        <button type="submit" style={{
          padding: "0 1rem", background: "var(--brand)", color: "var(--brand-fg)",
          border: "none", borderRadius: "var(--r-md)", fontWeight: 600,
          fontFamily: "inherit", cursor: "pointer",
        }}>Search</button>
      </form>

      {q.length < 2 && (
        <p style={{ color: "var(--text-secondary)" }}>Type at least 2 characters.</p>
      )}

      {results && totalHits === 0 && (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No matches for &ldquo;{q}&rdquo;.</p></Card>
      )}

      {results && results.groups.filter((g) => g.items.length > 0).map((g) => (
        <section key={g.label} style={{ marginBottom: "1.25rem" }}>
          <h2 style={{
            fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text-secondary)", margin: "0 0 0.5rem",
          }}>{g.label}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {g.items.map((it) => (
              <li key={it.id}>
                <Link href={g.href_template.replace("{id}", String(it.id))}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <Card>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9375rem" }}>{it.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {it.snippet}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
