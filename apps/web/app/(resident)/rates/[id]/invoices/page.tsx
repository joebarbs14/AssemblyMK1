import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type InvoiceOut } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { id } = await params;
  const propId = Number(id);
  if (!Number.isFinite(propId)) redirect("/rates");

  let invoices: InvoiceOut[] = [];
  try {
    invoices = await api<InvoiceOut[]>(`/api/rates/properties/${propId}/invoices`, { token });
  } catch {
    redirect("/rates");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1.25rem 6rem" }}>
      <Link href={`/rates/${propId}`} style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Back to property
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 1rem" }}>Invoices</h1>

      {invoices.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No invoices yet.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {invoices.map((inv) => (
            <li key={inv.id}>
              <Card style={{ padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{inv.invoice_number}</p>
                    <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      Issued {new Date(inv.issue_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      {" · Due "}
                      {new Date(inv.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      <span style={{ textTransform: "capitalize" }}>{inv.status}</span>
                    </p>
                  </div>
                  <Money cents={inv.amount_cents} emphasis />
                </div>
                {inv.line_items && inv.line_items.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0", fontSize: "0.8125rem" }}>
                    {inv.line_items.map((li, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.25rem 0",
                          color: "var(--text-secondary)",
                          borderTop: i === 0 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <span>{li.label}</span>
                        <Money cents={li.amount_cents} />
                      </li>
                    ))}
                  </ul>
                )}
                {inv.pdf_url && (
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem" }}>
                    <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                      Download PDF
                    </a>
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
