import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type TreeRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const STATUS_COLOR: Record<string, string> = {
  healthy: "#047857",
  stressed: "#C9A24B",
  dead: "#dc2626",
  removed: "#6b7280",
};

export default async function TreesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<TreeRow[]>("/api/trees", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Tree register
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Every council tree, QR-tagged. Adopt one — water it through summer, see it grow.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No trees in the register yet.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((t) => (
            <li key={t.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{t.species_common}</p>
                    {t.species_botanical && (
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-secondary)" }}>
                        {t.species_botanical}
                      </p>
                    )}
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {t.canopy_m && `${t.canopy_m.toFixed(1)}m canopy`}
                      {t.height_m && ` · ${t.height_m.toFixed(1)}m tall`}
                      {t.planted_on && ` · planted ${new Date(t.planted_on).getFullYear()}`}
                    </p>
                  </div>
                  <span style={{
                    padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    color: "#fff", background: STATUS_COLOR[t.status] ?? "#6b7280",
                    borderRadius: "var(--r-full)", alignSelf: "flex-start",
                  }}>{t.status}</span>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  QR: <code>{t.qr_payload}</code> · <Link href={`/tree/${t.qr_payload}`} style={{ color: "var(--brand)" }}>View / adopt</Link>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
