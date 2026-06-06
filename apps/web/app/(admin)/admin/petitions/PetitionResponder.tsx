"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function PetitionResponder({ token, petitionId }: { token: string; petitionId: number }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function respond() {
    setBusy(true);
    try {
      await api(`/api/admin/petitions/${petitionId}`, {
        method: "PATCH", token, body: { council_response: text },
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="Council's response — what we're going to do, and why."
        style={{
          width: "100%", padding: "0.5rem", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", fontFamily: "inherit", resize: "vertical",
        }} />
      <Button size="sm" onClick={respond} disabled={busy || text.length < 20}>
        {busy ? "Posting…" : "Post response"}
      </Button>
    </div>
  );
}
