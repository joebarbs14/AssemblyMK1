"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type KbArticleAdminRow } from "@/lib/api";

const CATEGORIES = ["waste", "rates", "pets", "permits", "water", "other"];

interface Draft {
  id?: number;
  title: string;
  category: string;
  body: string;
  source_url: string;
}

const EMPTY: Draft = { title: "", category: "waste", body: "", source_url: "" };

export function KbEditor({ token, initial }: { token: string; initial: KbArticleAdminRow[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const body = {
        title: draft.title, category: draft.category, body: draft.body,
        source_url: draft.source_url || null,
      };
      if (draft.id) {
        await api(`/api/admin/kb/${draft.id}`, { method: "PUT", token, body });
        setRows((rs) => rs.map((r) => r.id === draft.id ? { ...r, ...body, source_url: body.source_url ?? null } : r));
      } else {
        const r = await api<{ id: number }>("/api/admin/kb", { method: "POST", token, body });
        setRows((rs) => [{
          id: r.id, ...body, source_url: body.source_url ?? null,
          updated_at: new Date().toISOString(),
        }, ...rs]);
      }
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this article? The chatbot will lose this context.")) return;
    await api(`/api/admin/kb/${id}`, { method: "DELETE", token });
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <>
      {!draft && (
        <Button onClick={() => setDraft(EMPTY)} style={{ marginBottom: "1rem" }}>
          + New article
        </Button>
      )}

      {draft && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>
            {draft.id ? "Edit article" : "New article"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Input label="Title" value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <label style={{ fontSize: "0.875rem" }}>
              Category
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                style={sel}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.875rem" }}>
              Body
              <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={8}
                style={{ ...sel, resize: "vertical", lineHeight: 1.45 }} />
            </label>
            <Input label="Source URL (optional)" value={draft.source_url}
              onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button onClick={save} disabled={busy || !draft.title || draft.body.length < 10}>
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>
          No articles yet. The chatbot will say it doesn&apos;t know.
        </p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((a) => (
            <li key={a.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{a.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.7rem", textTransform: "uppercase",
                                letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {a.category}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <Button size="sm" variant="secondary"
                      onClick={() => setDraft({
                        id: a.id, title: a.title, category: a.category,
                        body: a.body, source_url: a.source_url ?? "",
                      })}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(a.id)}>Delete</Button>
                  </div>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", whiteSpace: "pre-wrap",
                             maxHeight: 100, overflow: "hidden" }}>{a.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
