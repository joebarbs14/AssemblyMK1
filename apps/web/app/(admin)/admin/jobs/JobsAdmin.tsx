"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type AdminJobRow } from "@/lib/api";

const KINDS = ["full_time", "part_time", "casual", "contract", "work_experience", "grad"];

export function JobsAdmin({ token, initial }: { token: string; initial: AdminJobRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "", employer: "", is_council: true, kind: "full_time",
    salary_min_cents: "", salary_max_cents: "", description: "",
    location: "", apply_url: "", closes_at: "",
  });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const body = {
        ...draft,
        salary_min_cents: draft.salary_min_cents ? Number(draft.salary_min_cents) * 100 : null,
        salary_max_cents: draft.salary_max_cents ? Number(draft.salary_max_cents) * 100 : null,
        closes_at: draft.closes_at || null,
        location: draft.location || null,
        apply_url: draft.apply_url || null,
      };
      const r = await api<{ id: number }>("/api/admin/jobs", { method: "POST", token, body });
      setRows((rs) => [{
        id: r.id, title: draft.title, employer: draft.employer,
        is_council: draft.is_council, kind: draft.kind, status: "open",
        posted_at: new Date().toISOString(),
        closes_at: body.closes_at,
      }, ...rs]);
      setDraft({ ...draft, title: "", description: "" });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function close(id: number) {
    if (!confirm("Close this listing?")) return;
    await api(`/api/admin/jobs/${id}/close`, { method: "POST", token });
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: "closed" } : r));
  }

  return (
    <>
      {!open && <Button onClick={() => setOpen(true)} style={{ marginBottom: "1rem" }}>+ New job</Button>}

      {open && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>New job</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Input label="Title" value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <Input label="Employer" value={draft.employer}
                onChange={(e) => setDraft({ ...draft, employer: e.target.value })} />
              <label style={{ fontSize: "0.875rem" }}>
                Kind
                <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                  style={sel}>
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </label>
            </div>
            <label style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", alignItems: "center" }}>
              <input type="checkbox" checked={draft.is_council}
                onChange={(e) => setDraft({ ...draft, is_council: e.target.checked })} />
              Council role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <Input label="Salary min ($)" type="number" value={draft.salary_min_cents}
                onChange={(e) => setDraft({ ...draft, salary_min_cents: e.target.value })} />
              <Input label="Salary max ($)" type="number" value={draft.salary_max_cents}
                onChange={(e) => setDraft({ ...draft, salary_max_cents: e.target.value })} />
            </div>
            <label style={{ fontSize: "0.875rem" }}>
              Description
              <textarea value={draft.description} rows={4}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                style={{ ...sel, resize: "vertical" }} />
            </label>
            <Input label="Location" value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            <Input label="Apply URL" type="url" value={draft.apply_url}
              onChange={(e) => setDraft({ ...draft, apply_url: e.target.value })} />
            <Input label="Closes" type="date" value={draft.closes_at}
              onChange={(e) => setDraft({ ...draft, closes_at: e.target.value })} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button onClick={create} disabled={busy || !draft.title || !draft.employer || !draft.description}>
                {busy ? "Posting…" : "Post"}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={head}>
              <th style={cell}>Title</th>
              <th style={cell}>Employer</th>
              <th style={cell}>Kind</th>
              <th style={cell}>Closes</th>
              <th style={cell}>Status</th>
              <th style={cell} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={cell}><strong>{r.title}</strong>{r.is_council && <span style={chip}>council</span>}</td>
                <td style={cell}>{r.employer}</td>
                <td style={cell}>{r.kind}</td>
                <td style={cell}>{r.closes_at ? new Date(r.closes_at).toLocaleDateString() : "—"}</td>
                <td style={cell}>{r.status}</td>
                <td style={cell}>
                  {r.status === "open" && (
                    <button onClick={() => close(r.id)}
                      style={{ background: "none", border: "none", color: "var(--danger)",
                                cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem" }}>
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

const cell: React.CSSProperties = { padding: "0.5rem 0.625rem", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = {
  background: "var(--surface-muted)", textTransform: "uppercase",
  fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)",
};
const chip: React.CSSProperties = {
  marginLeft: 6, fontSize: "0.65rem", padding: "0 0.5rem",
  background: "var(--brand)", color: "var(--brand-fg)",
  borderRadius: "var(--r-full)", fontWeight: 600,
};
const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
