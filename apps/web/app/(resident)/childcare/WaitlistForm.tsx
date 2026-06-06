"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function WaitlistForm({ token, centreId }: { token: string; centreId: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [needed, setNeeded] = useState("");
  const [days, setDays] = useState(5);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ position: number; status: string }>(
        `/api/childcare/${centreId}/waitlist`,
        { method: "POST", token, body: {
          child_first_name: name, child_dob: dob,
          needed_from: needed, days_per_week: days,
        }},
      );
      setResult(`On the list — position #${r.position}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return <p style={{ margin: 0, color: "#047857", fontSize: "0.875rem", fontWeight: 600 }}>{result}</p>;
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>Join waitlist</Button>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Input label="Child first name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      <Input label="Needed from" type="date" value={needed} onChange={(e) => setNeeded(e.target.value)} />
      <label style={{ fontSize: "0.875rem" }}>
        Days per week
        <input type="number" min={1} max={7} value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ marginLeft: "0.5rem", width: 64, padding: "0.25rem 0.5rem",
                   border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }} />
      </label>
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button size="sm" onClick={submit} disabled={busy || !name || !dob || !needed}>
          {busy ? "Joining…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
