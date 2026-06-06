"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function ExpressButton({ token, panelId, expressed, selected, recruiting }: {
  token: string; panelId: number; expressed: boolean; selected: boolean; recruiting: boolean;
}) {
  const [done, setDone] = useState(expressed);
  const [busy, setBusy] = useState(false);

  if (selected) {
    return <p style={{ margin: 0, color: "#047857", fontWeight: 700, fontSize: "0.875rem" }}>
      ✓ You&apos;re on the panel — check your email for details.
    </p>;
  }
  if (done) {
    return <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
      In the pool. You&apos;ll be emailed if drawn.
    </p>;
  }
  if (!recruiting) {
    return <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
      Recruitment closed.
    </p>;
  }

  async function express() {
    setBusy(true);
    try {
      await api(`/api/panels/${panelId}/express`, { method: "POST", token });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" onClick={express} disabled={busy}>
      {busy ? "Submitting…" : "Express interest"}
    </Button>
  );
}
