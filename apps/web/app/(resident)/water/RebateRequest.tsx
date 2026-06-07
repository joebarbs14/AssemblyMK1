"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, type WaterRebateScheme } from "@/lib/api";

export function RebateRequest({ token, propertyId, scheme }: {
  token: string; propertyId: number; scheme: WaterRebateScheme;
}) {
  const [open, setOpen] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ claim_amount_cents: number }>(
        `/api/water/properties/${propertyId}/rebate-claim`, {
        method: "POST", token,
        body: {
          scheme_id: scheme.id,
          invoice_amount_cents: Math.round(Number(invoice) * 100),
          receipt_url: receipt || null,
        },
      });
      setDone(`Lodged. Capped at $${(r.claim_amount_cents / 100).toFixed(2)}.`);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "#047857", fontWeight: 600 }}>
        {done}
      </p>
    );
  }

  if (!open) {
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Claim this rebate
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <Input label="Invoice amount ($)" type="number" step="0.01" value={invoice}
        onChange={(e) => setInvoice(e.target.value)} />
      <Input label="Receipt URL (optional)" value={receipt}
        onChange={(e) => setReceipt(e.target.value)} />
      <div style={{ display: "flex", gap: "0.375rem" }}>
        <Button size="sm" onClick={submit} disabled={busy || !invoice}>
          {busy ? "Lodging…" : "Lodge claim"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
