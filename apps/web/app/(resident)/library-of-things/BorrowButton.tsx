"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function BorrowButton({ token, itemId, available }: {
  token: string; itemId: number; available: boolean;
}) {
  const [state, setState] = useState<"idle" | "out" | "done">(available ? "idle" : "out");
  const [busy, setBusy] = useState(false);
  const [due, setDue] = useState<string | null>(null);

  async function borrow() {
    setBusy(true);
    try {
      const r = await api<{ due_at: string }>(`/api/lot/items/${itemId}/borrow`, { method: "POST", token });
      setDue(r.due_at);
      setState("done");
    } finally {
      setBusy(false);
    }
  }

  if (state === "done") {
    return <p style={{ margin: 0, color: "#047857", fontSize: "0.75rem", fontWeight: 600 }}>
      Due {due ? new Date(due).toLocaleDateString() : "soon"}
    </p>;
  }
  if (state === "out") {
    return <span style={{
      padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 600,
      background: "var(--surface-muted)", color: "var(--text-secondary)",
      borderRadius: "var(--r-full)",
    }}>On loan</span>;
  }
  return (
    <Button size="sm" variant="secondary" onClick={borrow} disabled={busy}>
      {busy ? "…" : "Borrow"}
    </Button>
  );
}
