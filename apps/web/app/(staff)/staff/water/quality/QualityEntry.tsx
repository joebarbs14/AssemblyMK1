"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function QualityEntry({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState("");
  const [taken, setTaken] = useState(new Date().toISOString().slice(0, 16));
  const [cl, setCl] = useState("");
  const [ph, setPh] = useState("");
  const [nt, setNt] = useState("");
  const [fl, setFl] = useState("");
  const [ec, setEc] = useState("0");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    try {
      await api("/api/staff/water/quality", {
        method: "POST", token,
        body: {
          sample_point: point,
          taken_at: new Date(taken).toISOString(),
          chlorine_mg_per_l: cl ? Number(cl) : null,
          ph: ph ? Number(ph) : null,
          turbidity_ntu: nt ? Number(nt) : null,
          fluoride_mg_per_l: fl ? Number(fl) : null,
          e_coli_per_100ml: ec ? Number(ec) : null,
        },
      });
      setPoint(""); setCl(""); setPh(""); setNt(""); setFl(""); setEc("0");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Log sample</Button>;
  }

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <Input label="Sample point" value={point}
          onChange={(e) => setPoint(e.target.value)} />
        <Input label="Taken at" type="datetime-local" value={taken}
          onChange={(e) => setTaken(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
                     gap: "0.5rem", marginTop: "0.5rem" }}>
        <Input label="Cl mg/L" type="number" step="0.01" value={cl}
          onChange={(e) => setCl(e.target.value)} />
        <Input label="pH" type="number" step="0.1" value={ph}
          onChange={(e) => setPh(e.target.value)} />
        <Input label="NTU" type="number" step="0.1" value={nt}
          onChange={(e) => setNt(e.target.value)} />
        <Input label="F mg/L" type="number" step="0.01" value={fl}
          onChange={(e) => setFl(e.target.value)} />
        <Input label="E.coli /100mL" type="number" value={ec}
          onChange={(e) => setEc(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <Button onClick={submit} disabled={busy || !point}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
}
