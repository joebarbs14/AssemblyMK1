"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { api, type VerificationRow } from "@/lib/api";

const PROVIDERS: { code: string; label: string; hint: string }[] = [
  { code: "service_nsw", label: "Service NSW Digital ID", hint: "MyServiceNSW app" },
  { code: "auspost_digital_id", label: "Australia Post Digital iD", hint: "PostiD" },
  { code: "local", label: "Council in-person verification", hint: "Show ID at customer service" },
];

export function VerifyIdentityPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<VerificationRow[]>("/api/account/verifications", { token })
      .then(setRows)
      .catch(() => setRows([]));
  }, [token]);

  async function verify(provider: string) {
    setBusy(provider);
    try {
      const v = await api<VerificationRow>("/api/account/verify-identity", {
        method: "POST", token, body: { provider },
      });
      setRows((r) => [...r.filter((x) => x.provider !== provider), v]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {PROVIDERS.map((p) => {
        const v = rows.find((r) => r.provider === p.code);
        return (
          <li key={p.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9375rem" }}>{p.label}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>{p.hint}</p>
            </div>
            {v ? (
              <span style={{
                padding: "0.25rem 0.625rem", fontSize: "0.75rem", fontWeight: 600,
                background: "rgba(4,120,87,0.1)", color: "#047857", borderRadius: "var(--r-full)",
              }}>✓ Verified</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => verify(p.code)} disabled={busy === p.code}>
                {busy === p.code ? "Verifying…" : "Verify"}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
