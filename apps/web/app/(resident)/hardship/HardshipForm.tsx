"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

const KINDS = [
  { v: "pensioner", l: "Pensioner concession" },
  { v: "hardship", l: "Financial hardship" },
  { v: "disability", l: "Disability concession" },
  { v: "veteran", l: "Veteran concession" },
  { v: "other", l: "Other" },
];

export function HardshipForm({ token }: { token: string }) {
  const router = useRouter();
  const [kind, setKind] = React.useState("pensioner");
  const [card, setCard] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [relief, setRelief] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/concessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          kind,
          pensioner_concession_card: card || null,
          reason,
          requested_relief: relief || null,
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't submit");
      }
      const out = (await r.json()) as { status: string };
      setDone(out.status === "approved" ? "Auto-approved." : "Submitted. Council will respond within 10 business days.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Card style={{ background: "var(--success-soft)", border: "1px solid var(--success)", color: "var(--success)" }}>
        ✓ {done}
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{
            padding: "0.625rem 0.75rem", minHeight: 44, borderRadius: "var(--r-md)",
            border: "1px solid var(--border)", background: "var(--surface)",
          }}>
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
        </div>
        {kind === "pensioner" && (
          <Input label="Pensioner concession card number" hint="Auto-approves on submit." value={card} onChange={(e) => setCard(e.target.value)} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="r" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Tell council your situation</label>
          <textarea id="r" required minLength={10} rows={5} value={reason} onChange={(e) => setReason(e.target.value)} style={{
            padding: "0.625rem 0.75rem", borderRadius: "var(--r-md)",
            border: "1px solid var(--border)", background: "var(--surface)",
            fontFamily: "inherit", fontSize: "0.9375rem",
          }} />
        </div>
        <Input label="What would help? (optional)" placeholder="e.g. defer payment, payment plan, rebate" value={relief} onChange={(e) => setRelief(e.target.value)} />
        {err && <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>{err}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit application"}</Button>
      </form>
    </Card>
  );
}
