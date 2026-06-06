"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export function FoiForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState("informal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/foi", { method: "POST", token, body: { title, description: desc, kind } });
      setOpen(false);
      setTitle(""); setDesc("");
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
        <Button onClick={() => setOpen(true)} fullWidth>Lodge a request</Button>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Toggle active={kind === "informal"} onClick={() => setKind("informal")} label="Informal (free)" />
          <Toggle active={kind === "formal"} onClick={() => setKind("formal")} label="Formal ($30)" />
        </div>
        <Input label="What are you looking for?" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 2023-24 noise complaints register" />
        <label style={{ fontSize: "0.875rem" }}>
          Describe in detail
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
            placeholder="Be specific about dates, departments, document types — helps us locate quickly."
            style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                     border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                     fontFamily: "inherit", resize: "vertical" }} />
        </label>
        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button onClick={submit} disabled={busy || !title || desc.length < 20}>
            {busy ? "Lodging…" : "Lodge"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "0.5rem 0.75rem", borderRadius: "var(--r-md)",
      border: "1px solid var(--border)", fontFamily: "inherit", fontWeight: 600,
      fontSize: "0.875rem", cursor: "pointer",
      background: active ? "var(--brand)" : "var(--surface)",
      color: active ? "var(--brand-fg)" : "var(--text-primary)",
    }}>{label}</button>
  );
}
