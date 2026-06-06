import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type ChildcareCentreRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { WaitlistForm } from "./WaitlistForm";

const RATING_COLOR: Record<string, string> = {
  exceeding: "#047857",
  meeting: "#C9A24B",
  working_towards: "#dc2626",
};

export default async function ChildcarePage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<ChildcareCentreRow[]>("/api/childcare", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Childcare
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Every centre in the shire. NQF ratings, fees, vacancies — join a waitlist in two taps.
      </p>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No centres listed.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((c) => (
            <li key={c.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", textTransform: "uppercase",
                                letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {c.kind.replace("_", " ")}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {c.address}
                    </p>
                  </div>
                  {c.rating && (
                    <span style={{
                      padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                      background: RATING_COLOR[c.rating] ?? "#6b7280", borderRadius: "var(--r-full)",
                      alignSelf: "flex-start",
                    }}>{c.rating.replace("_", " ")}</span>
                  )}
                </div>
                <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", fontSize: "0.8125rem" }}>
                  <span><Money cents={c.daily_fee_cents} />/day</span>
                  <span style={{ color: c.vacancies > 0 ? "#047857" : "var(--text-secondary)", fontWeight: 600 }}>
                    {c.vacancies > 0 ? `${c.vacancies} vacancies` : "Waitlist only"}
                  </span>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <WaitlistForm token={token} centreId={c.id} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
