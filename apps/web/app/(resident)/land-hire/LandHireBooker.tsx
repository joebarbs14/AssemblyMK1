"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, type LandHireRow } from "@/lib/api";

export function LandHireBooker({ token, resource }: { token: string; resource: LandHireRow }) {
  const [open, setOpen] = useState(false);
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: number; total_cents: number; status: string }>(
        `/api/land-hire/${resource.id}/book`,
        {
          method: "POST",
          token,
          body: {
            starts_at: new Date(starts).toISOString(),
            ends_at: new Date(ends).toISOString(),
            purpose: purpose || null,
          },
        },
      );
      setResult(`Booked! Reference #${r.id} — total $${(r.total_cents / 100).toFixed(2)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return <p style={{ margin: 0, color: "var(--success, #047857)", fontSize: "0.875rem" }}>{result}</p>;
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Book this resource
      </Button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label style={{ fontSize: "0.8125rem" }}>
        Start
        <Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
      </label>
      <label style={{ fontSize: "0.8125rem" }}>
        End
        <Input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
      </label>
      <label style={{ fontSize: "0.8125rem" }}>
        Purpose (optional)
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Family birthday" />
      </label>
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button size="sm" onClick={submit} disabled={busy || !starts || !ends}>
          {busy ? "Booking…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
