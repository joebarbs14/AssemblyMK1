import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type LostFoundRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LostFoundForm } from "./LostFoundForm";

export default async function LostFoundPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<LostFoundRow[]>("/api/lost-found", { token });

  const lost = rows.filter((r) => r.direction === "lost");
  const found = rows.filter((r) => r.direction === "found");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Lost &amp; found
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Pets and items. We&apos;ll match lost reports against found reports automatically.
      </p>

      <LostFoundForm token={token} />

      <ColumnList title="Found — claim yours" items={found} accent="#047857" />
      <ColumnList title="Lost — keep an eye out" items={lost} accent="#dc2626" />
    </main>
  );
}

function ColumnList({ title, items, accent }: { title: string; items: LostFoundRow[]; accent: string }) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>{title}</h2>
      {items.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>Nothing here.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.map((i) => (
            <li key={i.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{i.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", textTransform: "uppercase",
                                letterSpacing: "0.04em", color: accent, fontWeight: 700 }}>
                      {i.kind}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>{i.description}</p>
                    {i.contact && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        Contact: {i.contact}
                      </p>
                    )}
                  </div>
                  {i.status === "matched" && (
                    <span style={{
                      padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                      color: "#fff", background: "#047857", borderRadius: "var(--r-full)",
                    }}>MATCHED</span>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
