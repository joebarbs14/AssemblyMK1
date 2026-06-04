"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { BpayOut, PaypalOrder, PaymentRecord } from "@/lib/api";

type Tab = "paypal" | "bpay";

export function PayPanel({
  token,
  invoiceId,
  amountCents,
  invoiceNumber,
  bpay,
}: {
  token: string;
  invoiceId: number;
  amountCents: number;
  invoiceNumber: string;
  bpay: BpayOut | null;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("paypal");
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
    };
  }

  async function startPayPal() {
    setPending("paypal");
    setError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/rates/invoices/${invoiceId}/paypal-order`,
        { method: "POST", headers: headers() },
      );
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail ?? "PayPal couldn't start the order");
      }
      const order = (await r.json()) as PaypalOrder;
      // In dev / unconfigured mode the approve URL points at our return page
      // with mock=1; in prod it's a real PayPal redirect.
      if (order.mock) {
        // Skip the round-trip — go straight to capture.
        const cap = await fetch(
          `${API_BASE}/api/rates/invoices/${invoiceId}/paypal-capture`,
          {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ order_id: order.order_id }),
          },
        );
        if (!cap.ok) {
          const data = (await cap.json().catch(() => ({}))) as { detail?: string };
          throw new Error(data.detail ?? "Capture failed");
        }
        const payment = (await cap.json()) as PaymentRecord;
        setSuccess(
          `Test payment captured (mock mode): $${(payment.amount_cents / 100).toFixed(2)} AUD. Configure PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET to take real payments.`,
        );
        router.refresh();
      } else {
        window.location.href = order.approve_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <header
        style={{
          padding: "1.25rem 1.5rem 0.75rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
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
          Invoice {invoiceNumber}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Money cents={amountCents} emphasis />
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>AUD</p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Payment method"
        style={{
          display: "flex",
          padding: "0.75rem 0.75rem 0",
          gap: 4,
        }}
      >
        {(
          [
            { id: "paypal", label: "PayPal & card" },
            { id: "bpay", label: "BPAY" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              minHeight: 40,
              padding: "0.5rem 0.875rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: tab === t.id ? "var(--brand-soft)" : "transparent",
              color: tab === t.id ? "var(--brand)" : "var(--text-secondary)",
              border: "1px solid",
              borderColor: tab === t.id ? "var(--brand-soft)" : "transparent",
              borderRadius: "var(--r-md)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
        {tab === "paypal" && (
          <div>
            <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              Pay with PayPal, or use any Visa / Mastercard / Amex via PayPal Checkout.
              You'll be redirected to PayPal and back here when done.
            </p>
            <Button
              onClick={startPayPal}
              disabled={pending !== null}
              fullWidth
              size="lg"
              style={{
                background: "#FFC439",
                color: "#0B1220",
                fontWeight: 700,
                boxShadow: "var(--e1)",
              }}
            >
              {pending === "paypal" ? "Working…" : `Pay $${(amountCents / 100).toFixed(2)} with PayPal`}
            </Button>
            <p
              style={{
                marginTop: "0.75rem",
                marginBottom: 0,
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              Secured by PayPal. We don't see your card details.
            </p>
            {error && (
              <p
                role="alert"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.625rem 0.75rem",
                  background: "var(--danger-soft)",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  borderRadius: "var(--r-md)",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </p>
            )}
            {success && (
              <p
                role="status"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.625rem 0.75rem",
                  background: "var(--success-soft)",
                  border: "1px solid var(--success)",
                  color: "var(--success)",
                  borderRadius: "var(--r-md)",
                  fontSize: "0.875rem",
                }}
              >
                {success}
              </p>
            )}
          </div>
        )}

        {tab === "bpay" && (
          <div>
            {bpay ? (
              <>
                <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Open your banking app and pay using these details. The payment will
                  appear in your account within 1 business day.
                </p>
                <dl
                  style={{
                    margin: 0,
                    padding: "1rem 1.25rem",
                    background: "var(--brand-soft)",
                    border: "1px solid var(--brand-soft)",
                    borderRadius: "var(--r-md)",
                    display: "grid",
                    gridTemplateColumns: "max-content 1fr",
                    gap: "0.5rem 1rem",
                  }}
                >
                  <dt style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>Biller</dt>
                  <dd style={{ margin: 0, fontWeight: 700, fontSize: "1.125rem" }} className="tnum">
                    {bpay.biller_code}
                  </dd>
                  <dt style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>Reference</dt>
                  <dd style={{ margin: 0, fontWeight: 700, fontSize: "1.125rem" }} className="tnum">
                    {bpay.crn}
                  </dd>
                  <dt style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>Amount</dt>
                  <dd style={{ margin: 0, fontWeight: 700, fontSize: "1.125rem" }}>
                    <Money cents={amountCents} />
                  </dd>
                </dl>
                <p style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
                  <a href={bpay.deep_link}>Open in my banking app →</a>
                </p>
              </>
            ) : (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                BPAY isn't set up for this property yet.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
