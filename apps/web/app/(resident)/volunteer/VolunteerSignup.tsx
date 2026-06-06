"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function VolunteerSignup({ token, opportunityId, alreadySignedUp }: {
  token: string; opportunityId: number; alreadySignedUp: boolean;
}) {
  const [done, setDone] = useState(alreadySignedUp);
  const [busy, setBusy] = useState(false);

  if (done) {
    return <p style={{ margin: 0, color: "var(--success, #047857)", fontSize: "0.875rem", fontWeight: 600 }}>✓ You&apos;re signed up</p>;
  }

  async function signup() {
    setBusy(true);
    try {
      await api(`/api/volunteer/opportunities/${opportunityId}/signup`, { method: "POST", token });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" onClick={signup} disabled={busy}>
      {busy ? "Signing up…" : "Sign me up"}
    </Button>
  );
}
