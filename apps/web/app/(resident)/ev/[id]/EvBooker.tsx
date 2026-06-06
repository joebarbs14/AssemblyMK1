"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function EvBooker({ token, chargerId }: { token: string; chargerId: number }) {
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: number; status: string }>(
        `/api/ev/chargers/${chargerId}/book`,
        { method: "POST", token, body: {
          starts_at: new Date(starts).toISOString(),
          ends_at: new Date(ends).toISOString(),
        }},
      );
      setResult(`Booked — reference #${r.id}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) return <p style={{ margin: 0, color: "#047857", fontWeight: 600 }}>{result}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Input label="Start" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
      <Input label="End" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>{error}</p>}
      <Button onClick={submit} disabled={busy || !starts || !ends}>
        {busy ? "Booking…" : "Reserve"}
      </Button>
    </div>
  );
}
