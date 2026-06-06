"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function BurnPermitForm({ token }: { token: string }) {
  const [addr, setAddr] = useState("");
  const [kind, setKind] = useState("pile");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/burn-permits", {
        method: "POST", token,
        body: {
          property_address: addr,
          burn_kind: kind,
          starts_at: new Date(starts).toISOString(),
          ends_at: new Date(ends).toISOString(),
        },
      });
      router.refresh();
      setAddr(""); setStarts(""); setEnds("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Application failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Input label="Property address" value={addr} onChange={(e) => setAddr(e.target.value)} />
      <label style={{ fontSize: "0.875rem" }}>
        Burn kind
        <select value={kind} onChange={(e) => setKind(e.target.value)}
          style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                   borderRadius: "var(--r-md)", border: "1px solid var(--border)",
                   background: "var(--surface)", fontFamily: "inherit" }}>
          <option value="pile">Pile burn</option>
          <option value="stubble">Stubble burn</option>
          <option value="hazard_reduction">Hazard reduction</option>
        </select>
      </label>
      <Input label="Start" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
      <Input label="End" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
      <Button onClick={submit} disabled={busy || !addr || !starts || !ends}>
        {busy ? "Applying…" : "Apply"}
      </Button>
    </div>
  );
}
