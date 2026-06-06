import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type BurnPermitRow, type FireBanRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { BurnPermitForm } from "./BurnPermitForm";

const RATING_COLOR: Record<string, string> = {
  moderate: "#047857",
  high: "#C9A24B",
  extreme: "#dc2626",
  catastrophic: "#991b1b",
};

export default async function BurnPermitsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const [ban, mine] = await Promise.all([
    api<FireBanRow | null>("/api/fire-bans/current", { token }).catch(() => null),
    api<BurnPermitRow[]>("/api/burn-permits/mine", { token }).catch(() => [] as BurnPermitRow[]),
  ]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Burn-off permits
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Pile, stubble or hazard-reduction burns. Permits issued instantly when there&apos;s no fire ban.
      </p>

      {ban && (
        <Card style={{ marginBottom: "1rem", background: RATING_COLOR[ban.rating] ?? "#dc2626", color: "#fff", border: "none" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.9 }}>
            FIRE DANGER · {ban.source.toUpperCase()}
          </p>
          <h2 style={{ margin: "0.25rem 0", fontSize: "1.125rem", fontWeight: 700 }}>
            {ban.rating.toUpperCase()} until {new Date(ban.ends_at).toLocaleString()}
          </h2>
          {ban.note && <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.95 }}>{ban.note}</p>}
        </Card>
      )}

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Apply for a permit</h2>
        <BurnPermitForm token={token} />
      </Card>

      {mine.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Your permits</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {mine.map((p) => (
              <li key={p.id}>
                <Card>
                  <p style={{ margin: 0, fontWeight: 600 }}>{p.permit_no}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {p.burn_kind.replace("_", " ")} · {p.property_address}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>
                    {new Date(p.starts_at).toLocaleString()} → {new Date(p.ends_at).toLocaleString()}
                  </p>
                  {p.conditions && (
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <strong>Conditions:</strong> {p.conditions}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
