import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type LotItemRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { BorrowButton } from "./BorrowButton";

export default async function LotPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<LotItemRow[]>("/api/lot/items", { token });

  const groups: Record<string, LotItemRow[]> = {};
  for (const r of rows) (groups[r.kind] ??= []).push(r);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Library of Things
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Borrow what you need. Tools, kitchen gear, projectors — return it, someone else uses it.
      </p>

      {Object.entries(groups).map(([kind, items]) => (
        <section key={kind} style={{ marginBottom: "1.25rem" }}>
          <h2 style={{
            fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text-secondary)", margin: "0 0 0.5rem",
          }}>{kind}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((i) => (
              <li key={i.id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{i.name}</p>
                      {i.description && (
                        <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                          {i.description}
                        </p>
                      )}
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {i.deposit_cents > 0 ? <>Deposit <Money cents={i.deposit_cents} /> · </> : <>No deposit · </>}
                        {i.max_loan_days} day loan
                      </p>
                    </div>
                    <BorrowButton token={token} itemId={i.id} available={i.available} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
