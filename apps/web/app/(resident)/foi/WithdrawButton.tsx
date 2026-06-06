"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";

export function WithdrawButton({ token, requestId }: { token: string; requestId: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function withdraw() {
    if (!confirm("Withdraw this request? You can lodge again later.")) return;
    setBusy(true);
    try {
      await api(`/api/foi/${requestId}`, { method: "DELETE", token });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={withdraw} disabled={busy}
      style={{
        background: "none", border: "none", padding: 0,
        color: "var(--text-secondary)", fontSize: "0.75rem", textDecoration: "underline",
        cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit",
      }}>{busy ? "…" : "Withdraw"}</button>
  );
}
