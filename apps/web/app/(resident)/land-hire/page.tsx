import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type LandHireRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LandHireBooker } from "./LandHireBooker";

export default async function LandHirePage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<LandHireRow[]>("/api/land-hire", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Hire council land
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Halls, ovals, campsites, BBQ areas — book online, pay on confirmation.
      </p>

      {rows.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No resources listed yet.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.25rem" }}>{r.name}</h2>
                    <p style={{
                      margin: 0, fontSize: "0.7rem", textTransform: "uppercase",
                      letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600,
                    }}>{r.kind.replace("_", " ")}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      <Money cents={r.fee_cents_per_unit} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>/{r.fee_unit}</span>
                    </p>
                    {r.capacity && (
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Cap. {r.capacity}
                      </p>
                    )}
                  </div>
                </div>
                {r.description && (
                  <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem" }}>{r.description}</p>
                )}
                {r.available ? (
                  <div style={{ marginTop: "0.75rem" }}>
                    <LandHireBooker token={token} resource={r} />
                  </div>
                ) : (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--danger)" }}>
                    Currently unavailable
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
