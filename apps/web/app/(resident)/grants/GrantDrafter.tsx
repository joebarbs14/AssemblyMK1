"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function GrantDrafter({ token }: { token: string }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [grant, setGrant] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await fetch(`${API_BASE}/api/grants/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          title,
          grant_name: grant || null,
          project_summary: summary,
          requested_amount_cents: amount ? Math.round(parseFloat(amount) * 100) : null,
        }),
      });
      setTitle("");
      setGrant("");
      setSummary("");
      setAmount("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Input label="Project title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Grant program (optional)" value={grant} onChange={(e) => setGrant(e.target.value)} placeholder="e.g. Stronger Country Communities Fund" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="s" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Project summary</label>
          <textarea id="s" required minLength={20} rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} style={{
            padding: "0.625rem 0.75rem", borderRadius: "var(--r-md)",
            border: "1px solid var(--border)", background: "var(--surface)",
            fontFamily: "inherit", fontSize: "0.9375rem",
          }} />
        </div>
        <Input label="Requested amount (AUD)" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button type="submit" disabled={pending}>{pending ? "Drafting…" : "Generate draft"}</Button>
      </form>
    </Card>
  );
}
