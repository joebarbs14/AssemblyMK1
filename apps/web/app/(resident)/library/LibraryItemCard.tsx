"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, type LibraryItemRow } from "@/lib/api";

export function LibraryItemCard({ token, item }: { token: string; item: LibraryItemRow }) {
  const [held, setHeld] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function hold() {
    setBusy(true);
    try {
      const r = await api<{ status: string }>(`/api/library/${item.id}/hold`, { method: "POST", token });
      setHeld(r.status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
          {item.author && (
            <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {item.author}
            </p>
          )}
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {item.kind} · {item.copies_available} of {item.copies_total} available
          </p>
          {item.blurb && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem" }}>{item.blurb}</p>
          )}
        </div>
        {held ? (
          <span style={{
            padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.04em",
            background: held === "ready" ? "#047857" : "var(--surface-muted)",
            color: held === "ready" ? "#fff" : "var(--text-secondary)",
            borderRadius: "var(--r-full)",
          }}>{held}</span>
        ) : (
          <Button size="sm" variant="secondary" onClick={hold} disabled={busy}>
            {busy ? "…" : "Hold"}
          </Button>
        )}
      </div>
    </Card>
  );
}
