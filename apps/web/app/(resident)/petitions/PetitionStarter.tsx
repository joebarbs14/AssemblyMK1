"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function PetitionStarter({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/petitions", { method: "POST", token, body: { title, summary, ask } });
      setOpen(false);
      setTitle(""); setSummary(""); setAsk("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Card>
        <Button onClick={() => setOpen(true)} fullWidth>Start a petition</Button>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)}
          hint="Short, specific. 10–200 chars." />
        <label style={{ fontSize: "0.875rem" }}>
          Summary
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
            style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                     border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                     fontFamily: "inherit", resize: "vertical" }} />
        </label>
        <label style={{ fontSize: "0.875rem" }}>
          The ask (what exactly should council do?)
          <textarea value={ask} onChange={(e) => setAsk(e.target.value)} rows={2}
            style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                     border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                     fontFamily: "inherit", resize: "vertical" }} />
        </label>
        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button onClick={submit} disabled={busy || !title || !summary || !ask}>
            {busy ? "Publishing…" : "Publish"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
