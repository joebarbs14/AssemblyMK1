import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import { readSessionToken } from "@/lib/session";

interface CaptureResponse {
  id: number;
  amount_cents: number;
  status: string;
  provider: string;
}

export default async function PayPalReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; invoice?: string; PayerID?: string }>;
}) {
  const sess = await readSessionToken();
  if (!sess) redirect("/login");
  const { id } = await params;
  const propId = Number(id);
  const sp = await searchParams;
  const orderId = sp.token;
  const invoiceId = Number(sp.invoice);

  if (!orderId || !Number.isFinite(invoiceId)) {
    redirect(`/rates/${propId}/pay?cancelled=1`);
  }

  let result: CaptureResponse | null = null;
  let error: string | null = null;
  try {
    const r = await fetch(
      `${API_BASE}/api/rates/invoices/${invoiceId}/paypal-capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({ order_id: orderId }),
      },
    );
    if (!r.ok) {
      const data = (await r.json().catch(() => ({}))) as { detail?: string };
      error = data.detail ?? `Capture failed (HTTP ${r.status})`;
    } else {
      result = (await r.json()) as CaptureResponse;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't reach the API";
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Card>
        {result?.status === "succeeded" ? (
          <>
            <div
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--r-full)",
                background: "var(--success-soft)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                marginBottom: "0.75rem",
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
              Payment received
            </h1>
            <p style={{ margin: "0 0 1.25rem", color: "var(--text-secondary)" }}>
              Thanks. We've credited your rates account with{" "}
              <strong>
                <Money cents={result.amount_cents} />
              </strong>
              .
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/rates/${propId}`}>
                <Button>Back to property</Button>
              </Link>
              <Link href="/">
                <Button variant="secondary">Home</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
              We couldn't confirm the payment
            </h1>
            <p
              role="alert"
              style={{
                margin: "0 0 1rem",
                padding: "0.75rem 1rem",
                background: "var(--danger-soft)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                borderRadius: "var(--r-md)",
                fontSize: "0.875rem",
              }}
            >
              {error ?? "PayPal returned an unexpected status."}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              If your bank shows the charge, we'll reconcile it automatically once
              PayPal confirms via webhook. Otherwise no money was taken.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: "0.75rem" }}>
              <Link href={`/rates/${propId}/pay`}>
                <Button>Try again</Button>
              </Link>
              <Link href={`/rates/${propId}`}>
                <Button variant="secondary">Back to property</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
