"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type LostFoundRow } from "@/lib/api";

export function LostFoundForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"lost" | "found">("lost");
  const [kind, setKind] = useState<"pet" | "item">("pet");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<number | null>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setError(null);
    setMatch(null);
    try {
      const r = await api<LostFoundRow>("/api/lost-found", {
        method: "POST", token,
        body: { direction, kind, title, description: desc, contact: contact || null },
      });
      if (r.candidate_match_id) setMatch(r.candidate_match_id);
      setTitle(""); setDesc(""); setContact("");
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
        <Button onClick={() => setOpen(true)} fullWidth>Report lost or found</Button>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Toggle active={direction === "lost"} onClick={() => setDirection("lost")} label="I lost something" />
          <Toggle active={direction === "found"} onClick={() => setDirection("found")} label="I found something" />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Toggle active={kind === "pet"} onClick={() => setKind("pet")} label="Pet" />
          <Toggle active={kind === "item"} onClick={() => setKind("item")} label="Item" />
        </div>
        <Input label="Short title" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "pet" ? "Tabby cat, red collar" : "AirPods Pro case"} />
        <label style={{ fontSize: "0.875rem" }}>
          Description
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
            style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                     borderRadius: "var(--r-md)", border: "1px solid var(--border)",
                     fontFamily: "inherit", resize: "vertical" }} />
        </label>
        <Input label="How to contact (optional)" value={contact} onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or email" />
        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
        {match !== null && (
          <p style={{ margin: 0, color: "#047857", fontSize: "0.875rem", fontWeight: 600 }}>
            Possible match found! See the {direction === "lost" ? "found" : "lost"} list below.
          </p>
        )}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button onClick={submit} disabled={busy || !title || !desc}>
            {busy ? "Posting…" : "Post"}
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
