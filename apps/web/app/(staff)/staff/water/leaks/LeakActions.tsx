"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api, type LeakAlertRow } from "@/lib/api";

export function LeakActions({ token, initial }: {
  token: string; initial: LeakAlertRow[];
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();
  void initial;

  async function scan() {
    setBusy(true);
    try {
      const r = await api<{ new_alerts: number }>("/api/staff/water/leaks/scan",
        { method: "POST", token });
      setResult(`Scan complete — ${r.new_alerts} new alert${r.new_alerts === 1 ? "" : "s"}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <Button size="sm" onClick={scan} disabled={busy}>
        {busy ? "Scanning…" : "Run anomaly scan"}
      </Button>
      {result && (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{result}</p>
      )}
    </div>
  );
}
