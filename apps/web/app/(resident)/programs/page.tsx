import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type ProgramRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { ProgramBookButton } from "./ProgramBookButton";

const KIND_LABEL: Record<string, string> = {
  volunteer: "Volunteer",
  booking: "Book a venue",
  class: "Class",
};

export default async function ProgramsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const programs = await api<ProgramRow[]>("/api/programs", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Programs & bookings
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Volunteer with council programs or book a community facility.
      </p>

      {programs.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Nothing on offer right now.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {programs.map((p) => (
            <li key={p.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 600 }}>{p.title}</h2>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "2px 8px",
                      borderRadius: "var(--r-full)",
                      background: "var(--brand-soft)",
                      color: "var(--brand)",
                    }}
                  >
                    {KIND_LABEL[p.kind] ?? p.kind}
                  </span>
                </div>
                <p style={{ margin: "0.375rem 0", color: "var(--text-secondary)" }}>{p.description}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {p.starts_at && (
                    <span>
                      {new Date(p.starts_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {p.location && <span>{p.location}</span>}
                  {p.spots_remaining != null && (
                    <span style={{ fontWeight: 600, color: p.spots_remaining > 0 ? "var(--success)" : "var(--danger)" }}>
                      {p.spots_remaining > 0 ? `${p.spots_remaining} spots left` : "Full"}
                    </span>
                  )}
                  {p.fee_cents > 0 && (
                    <span>
                      Fee <Money cents={p.fee_cents} />
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <ProgramBookButton programId={p.id} disabled={!p.bookings_open || p.spots_remaining === 0} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
