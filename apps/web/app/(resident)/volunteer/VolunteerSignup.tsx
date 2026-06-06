"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function VolunteerSignup({ token, opportunityId, alreadySignedUp }: {
  token: string; opportunityId: number; alreadySignedUp: boolean;
}) {
  const [done, setDone] = useState(alreadySignedUp);
  const [busy, setBusy] = useState(false);

  async function signup() {
    setBusy(true);
    try {
      await api(`/api/volunteer/opportunities/${opportunityId}/signup`, { method: "POST", token });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancel your signup?")) return;
    setBusy(true);
    try {
      await api(`/api/volunteer/opportunities/${opportunityId}/signup`, { method: "DELETE", token });
      setDone(false);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <p style={{ margin: 0, color: "#047857", fontSize: "0.875rem", fontWeight: 600 }}>
          ✓ You&apos;re signed up
        </p>
        <button type="button" onClick={cancel} disabled={busy} style={{
          background: "none", border: "none", padding: 0,
          color: "var(--text-secondary)", fontSize: "0.75rem", textDecoration: "underline",
          cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}>{busy ? "…" : "Cancel"}</button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={signup} disabled={busy}>
      {busy ? "Signing up…" : "Sign me up"}
    </Button>
  );
}
