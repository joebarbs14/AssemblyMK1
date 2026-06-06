import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type TourismRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const KIND_LABEL: Record<string, string> = {
  attraction: "Attractions",
  trail: "Walks & trails",
  event: "What's on",
  lodging: "Stay",
  food: "Eat & drink",
};

export default async function TourismPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<TourismRow[]>("/api/tourism", { token });

  const groups: Record<string, TourismRow[]> = {};
  for (const r of rows) (groups[r.kind] ??= []).push(r);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Visitor information
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        What&apos;s on, where to stay, things to do. Bring the VIC desk in your pocket.
      </p>

      {Object.entries(groups).map(([kind, items]) => (
        <section key={kind} style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            {KIND_LABEL[kind] ?? kind}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((t) => (
              <li key={t.id}>
                <Card>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t.name}</p>
                  {t.address && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{t.address}</p>
                  )}
                  {t.starts_at && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {new Date(t.starts_at).toLocaleDateString()}
                      {t.ends_at && ` → ${new Date(t.ends_at).toLocaleDateString()}`}
                    </p>
                  )}
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>{t.blurb}</p>
                  {t.tags && t.tags.length > 0 && (
                    <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {t.tags.map((tag) => (
                        <span key={tag} style={{
                          fontSize: "0.7rem", padding: "0.125rem 0.5rem",
                          background: "var(--surface-muted)", borderRadius: "var(--r-full)",
                          color: "var(--text-secondary)",
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
