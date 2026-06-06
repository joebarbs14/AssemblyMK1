"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function SignButton({ token, petitionId, signed, canSign }: {
  token: string; petitionId: number; signed: boolean; canSign: boolean;
}) {
  const [done, setDone] = useState(signed);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (done) {
    return <p style={{ margin: 0, color: "#047857", fontSize: "0.875rem", fontWeight: 600 }}>
      ✓ Signed
    </p>;
  }
  if (!canSign) {
    return <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
      Signatures closed
    </p>;
  }

  async function sign() {
    setBusy(true);
    try {
      await api(`/api/petitions/${petitionId}/sign`, { method: "POST", token, body: {} });
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" onClick={sign} disabled={busy}>
      {busy ? "Signing…" : "Sign"}
    </Button>
  );
}
