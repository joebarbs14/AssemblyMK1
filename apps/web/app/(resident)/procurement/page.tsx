import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type ContractRow, type TenderRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function ProcurementPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const [tenders, contracts] = await Promise.all([
    api<TenderRow[]>("/api/tenders", { token }),
    api<ContractRow[]>("/api/contracts", { token }),
  ]);

  const totalAwarded = contracts.reduce((s, c) => s + c.value_cents, 0);
  const localCount = contracts.filter((c) => c.local_supplier).length;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Tenders &amp; contracts
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Live tenders and awarded contracts. Buy local: we publish a local-supplier flag on every award.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "0.5rem", marginBottom: "1rem" }}>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Open tenders</p>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{tenders.filter((t) => t.status === "open").length}</p></Card>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Awarded</p>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{contracts.length}</p></Card>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>To local</p>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#047857" }}>
            {contracts.length ? Math.round((localCount / contracts.length) * 100) : 0}%
          </p></Card>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total value</p>
          <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
            <Money cents={totalAwarded} />
          </p></Card>
      </div>

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Open tenders</h2>
      {tenders.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None at the moment.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {tenders.map((t) => (
            <li key={t.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{t.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {t.reference} · {t.category} · closes {new Date(t.closes_at).toLocaleDateString()}
                    </p>
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>{t.description}</p>
                  </div>
                  {t.estimated_value_cents !== null && (
                    <p style={{ margin: 0, fontWeight: 600, textAlign: "right", fontSize: "0.875rem" }}>
                      <Money cents={t.estimated_value_cents} />
                    </p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Awarded contracts</h2>
      {contracts.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None published.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {contracts.map((c) => (
            <li key={c.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {c.supplier_name}{c.supplier_abn && ` · ABN ${c.supplier_abn}`}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {c.contract_no} · {new Date(c.starts_on).toLocaleDateString()} → {new Date(c.ends_on).toLocaleDateString()}
                    </p>
                    {c.summary && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem" }}>{c.summary}</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: 600 }}><Money cents={c.value_cents} /></p>
                    {c.local_supplier && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", fontWeight: 700,
                                   color: "#047857", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Local
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
