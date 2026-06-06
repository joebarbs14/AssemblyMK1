"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function ClaimAdminButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ role: string; message: string }>(
        "/api/auth/claim-admin", { method: "POST" },
      );
      setMsg(`${r.message}. Reload to access /staff and /admin.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={claim} disabled={busy}
        title="Promote to admin if your email is on the BOOTSTRAP_ADMIN_EMAILS allowlist">
        {busy ? "Claiming…" : "Claim admin"}
      </Button>
      {msg && (
        <p style={{ width: "100%", margin: "0.5rem 0 0", fontSize: "0.8125rem",
                     color: msg.startsWith("Promoted") || msg.startsWith("Already") ? "#047857" : "var(--danger)" }}>
          {msg}
        </p>
      )}
    </>
  );
}
