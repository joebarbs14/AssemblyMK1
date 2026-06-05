import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type BpayOut, type InvoiceOut, type PropertyDetail } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { PayPanel } from "./PayPanel";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelled?: string; invoice?: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const propId = Number(id);
  if (!Number.isFinite(propId)) redirect("/rates");

  let property: PropertyDetail;
  let invoices: InvoiceOut[];
  let bpay: BpayOut | null = null;
  try {
    [property, invoices] = await Promise.all([
      api<PropertyDetail>(`/api/rates/properties/${propId}`, { token }),
      api<InvoiceOut[]>(`/api/rates/properties/${propId}/invoices`, { token }),
    ]);
    if (property.account) {
      try {
        bpay = await api<BpayOut>(`/api/rates/properties/${propId}/bpay`, { token });
      } catch {
        bpay = null;
      }
    }
  } catch {
    redirect("/rates");
  }

  const openInvoice =
    invoices.find((i) => i.id === Number(sp.invoice)) ??
    invoices.find((i) => i.status === "issued") ??
    invoices.find((i) => i.status !== "paid") ??
    null;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.25rem 1.25rem 6rem" }}>
      <Link href={`/rates/${propId}`} style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Back to property
      </Link>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>Pay rates</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>{property.address}</p>

      {sp.cancelled && (
        <div
          role="status"
          style={{
            background: "var(--warning-soft)",
            border: "1px solid var(--gold)",
            color: "var(--gold-deep)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--r-md)",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          PayPal payment was cancelled. Nothing was charged.
        </div>
      )}

      {openInvoice ? (
        <PayPanel
          token={token}
          invoiceId={openInvoice.id}
          amountCents={openInvoice.amount_cents}
          invoiceNumber={openInvoice.invoice_number}
          bpay={bpay}
        />
      ) : (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "1.125rem", fontWeight: 600 }}>You're up to date</h2>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            No outstanding invoices on this property.
          </p>
        </Card>
      )}

      {property.account && property.account.balance_cents > 0 && (
        <Card style={{ marginTop: "1rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Total balance
          </p>
          <Money cents={property.account.balance_cents} emphasis />
        </Card>
      )}
    </main>
  );
}
