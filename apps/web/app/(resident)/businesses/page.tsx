import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type BusinessRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function BusinessesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const businesses = await api<BusinessRow[]>("/api/businesses", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Local businesses
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council-verified trades and services in the shire. Skip the "anyone know a sparky?" post.
      </p>

      {businesses.length === 0 ? (
        <Card><p style={{ color: "var(--text-secondary)", margin: 0 }}>No listings yet.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {businesses.map((b) => (
            <li key={b.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.0625rem" }}>
                    {b.name}
                    {b.verified && (
                      <span title="Council-verified" style={{ marginLeft: 6, color: "var(--brand)", fontSize: "0.8125rem" }}>
                        ✓
                      </span>
                    )}
                  </p>
                  <span style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 8px",
                    borderRadius: "var(--r-full)",
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}>
                    {b.category}
                  </span>
                </div>
                {b.description && <p style={{ margin: "0.375rem 0", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>{b.description}</p>}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.8125rem" }}>
                  {b.phone && <a href={`tel:${b.phone}`}>{b.phone}</a>}
                  {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
                  {b.address && <span style={{ color: "var(--text-secondary)" }}>{b.address}</span>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
