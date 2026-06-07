"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function SelfReadForm({ token, propertyId }: { token: string; propertyId: number }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [readOn, setReadOn] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/water/properties/${propertyId}/self-read`, {
        method: "POST", token,
        body: { read_on: readOn, value_kl: Number(val), note: note || null },
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#047857", fontWeight: 600 }}>
        ✓ Meter read submitted — awaiting verification.
      </p>
    );
  }

  if (!open) {
    return (
      <div style={{ marginTop: "0.75rem" }}>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Submit a meter read
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <Input label="Meter value (kL)" type="number" step="0.01" value={val}
          onChange={(e) => setVal(e.target.value)} />
        <Input label="Read on" type="date" value={readOn}
          onChange={(e) => setReadOn(e.target.value)} />
      </div>
      <Input label="Note (optional)" value={note}
        onChange={(e) => setNote(e.target.value)} />
      <div style={{ display: "flex", gap: "0.375rem" }}>
        <Button size="sm" onClick={submit} disabled={busy || !val}>
          {busy ? "Submitting…" : "Submit"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
