"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function ApplyButton({ token, plotId, status }: {
  token: string; plotId: number; status: string;
}) {
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (applied) {
    return <p style={{ margin: 0, fontSize: "0.75rem", color: "#047857", fontWeight: 600 }}>
      {applied === "active" ? "✓ Yours" : "On waitlist"}
    </p>;
  }
  if (status === "maintenance") {
    return <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Maintenance</p>;
  }

  async function apply() {
    setBusy(true);
    try {
      const r = await api<{ status: string }>(`/api/gardens/plots/${plotId}/apply`,
        { method: "POST", token });
      setApplied(r.status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={apply} disabled={busy} fullWidth>
      {busy ? "…" : status === "available" ? "Take this plot" : "Waitlist"}
    </Button>
  );
}
