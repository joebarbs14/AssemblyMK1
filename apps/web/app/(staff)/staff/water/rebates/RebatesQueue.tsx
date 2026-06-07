"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api } from "@/lib/api";

interface RebateClaimRow {
  id: number; scheme_label: string;
  property_id: number; address: string;
  invoice_amount_cents: number; claim_amount_cents: number;
  status: string; receipt_url: string | null;
  created_at: string; decision_note: string | null;
}

export function RebatesQueue({ token, initial }: {
  token: string; initial: RebateClaimRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(id: number, status: "approved" | "rejected" | "paid", note: string | null) {
    setBusy(id);
    try {
      await api(`/api/staff/water/rebates/claims/${id}`, {
        method: "PATCH", token, body: { status, decision_note: note },
      });
      setRows((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0,
                 display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {rows.map((r) => (
        <li key={r.id}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{r.scheme_label}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8125rem",
                             color: "var(--text-secondary)" }}>{r.address}</p>
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.875rem" }}>
                  Invoice <Money cents={r.invoice_amount_cents} /> · claim{" "}
                  <strong><Money cents={r.claim_amount_cents} /></strong>
                </p>
                {r.receipt_url && (
                  <a href={r.receipt_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: "0.75rem", color: "var(--brand)" }}>Receipt →</a>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.375rem", alignItems: "flex-start" }}>
                <Button size="sm" onClick={() => decide(r.id, "approved", null)} disabled={busy === r.id}>
                  Approve
                </Button>
                <Button size="sm" variant="danger"
                  onClick={() => {
                    const why = prompt("Reason for rejection?");
                    if (why) decide(r.id, "rejected", why);
                  }}
                  disabled={busy === r.id}>Reject</Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
      {rows.length === 0 && (
        <li><Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>
          No claims awaiting review.
        </p></Card></li>
      )}
    </ul>
  );
}
