"use client";

import { Fragment, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { api, type AdminTenderRow } from "@/lib/api";

const CATEGORIES = ["construction", "services", "supplies", "consulting"];

export function TendersAdmin({ token, initial }: { token: string; initial: AdminTenderRow[] }) {
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [awardingId, setAwardingId] = useState<number | null>(null);

  async function close(id: number) {
    if (!confirm("Close this tender?")) return;
    await api(`/api/admin/tenders/${id}/close`, { method: "POST", token });
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: "closed" } : r));
  }

  return (
    <>
      {!creating && <Button onClick={() => setCreating(true)} style={{ marginBottom: "1rem" }}>+ New tender</Button>}
      {creating && <NewTender token={token} onCreated={(t) => { setRows((rs) => [t, ...rs]); setCreating(false); }} onCancel={() => setCreating(false)} />}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={head}>
              <th style={cell}>Ref</th>
              <th style={cell}>Title</th>
              <th style={cell}>Category</th>
              <th style={cell}>Closes</th>
              <th style={cell}>Est. value</th>
              <th style={cell}>Status</th>
              <th style={cell} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ ...cell, fontFamily: "monospace" }}>{r.reference}</td>
                  <td style={cell}><strong>{r.title}</strong></td>
                  <td style={cell}>{r.category}</td>
                  <td style={cell}>{new Date(r.closes_at).toLocaleDateString()}</td>
                  <td style={cell}>
                    {r.estimated_value_cents !== null ? <Money cents={r.estimated_value_cents} /> : "—"}
                  </td>
                  <td style={cell}>{r.status}</td>
                  <td style={cell}>
                    {r.status === "open" && (
                      <button onClick={() => close(r.id)} style={linkBtn}>Close</button>
                    )}
                    {r.status === "closed" && (
                      <button onClick={() => setAwardingId(awardingId === r.id ? null : r.id)} style={linkBtn}>
                        {awardingId === r.id ? "Cancel" : "Award"}
                      </button>
                    )}
                    {r.status === "awarded" && (
                      <span style={{ color: "#047857", fontWeight: 600 }}>Awarded</span>
                    )}
                  </td>
                </tr>
                {awardingId === r.id && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <AwardForm token={token} tenderId={r.id}
                        onAwarded={() => {
                          setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, status: "awarded" } : x));
                          setAwardingId(null);
                        }} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function NewTender({ token, onCreated, onCancel }: {
  token: string;
  onCreated: (t: AdminTenderRow) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    title: "", description: "", category: "services",
    estimated_value_cents: "",
    opens_at: new Date().toISOString().slice(0, 10),
    closes_at: "", documents_url: "",
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ id: number; reference: string }>("/api/admin/tenders", {
        method: "POST", token,
        body: {
          ...draft,
          estimated_value_cents: draft.estimated_value_cents
            ? Number(draft.estimated_value_cents) * 100 : null,
          documents_url: draft.documents_url || null,
        },
      });
      onCreated({
        id: r.id, reference: r.reference, title: draft.title,
        category: draft.category, status: "open",
        estimated_value_cents: draft.estimated_value_cents
          ? Number(draft.estimated_value_cents) * 100 : null,
        opens_at: draft.opens_at, closes_at: draft.closes_at,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>New tender</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Input label="Title" value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <label style={{ fontSize: "0.875rem" }}>
          Description
          <textarea value={draft.description} rows={3}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            style={{ ...sel, resize: "vertical" }} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.875rem" }}>
            Category
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              style={sel}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <Input label="Opens" type="date" value={draft.opens_at}
            onChange={(e) => setDraft({ ...draft, opens_at: e.target.value })} />
          <Input label="Closes" type="date" value={draft.closes_at}
            onChange={(e) => setDraft({ ...draft, closes_at: e.target.value })} />
        </div>
        <Input label="Estimated value ($)" type="number" value={draft.estimated_value_cents}
          onChange={(e) => setDraft({ ...draft, estimated_value_cents: e.target.value })} />
        <Input label="Documents URL" type="url" value={draft.documents_url}
          onChange={(e) => setDraft({ ...draft, documents_url: e.target.value })} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button onClick={submit} disabled={busy || !draft.title || !draft.description || !draft.closes_at}>
            {busy ? "Posting…" : "Open tender"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

function AwardForm({ token, tenderId, onAwarded }: {
  token: string; tenderId: number; onAwarded: () => void;
}) {
  const [draft, setDraft] = useState({
    title: "", supplier_name: "", supplier_abn: "",
    value_cents: "", starts_on: "", ends_on: "",
    local_supplier: false, summary: "",
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/admin/tenders/${tenderId}/award`, {
        method: "POST", token,
        body: {
          title: draft.title,
          supplier_name: draft.supplier_name,
          supplier_abn: draft.supplier_abn || null,
          value_cents: Number(draft.value_cents) * 100,
          starts_on: draft.starts_on,
          ends_on: draft.ends_on,
          local_supplier: draft.local_supplier,
          summary: draft.summary || null,
        },
      });
      onAwarded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "1rem", background: "var(--surface-muted)",
                   borderTop: "1px solid var(--border)" }}>
      <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Award contract</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <Input label="Contract title" value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <Input label="Supplier" value={draft.supplier_name}
          onChange={(e) => setDraft({ ...draft, supplier_name: e.target.value })} />
        <Input label="ABN" value={draft.supplier_abn}
          onChange={(e) => setDraft({ ...draft, supplier_abn: e.target.value })} />
        <Input label="Value ($)" type="number" value={draft.value_cents}
          onChange={(e) => setDraft({ ...draft, value_cents: e.target.value })} />
        <Input label="Starts" type="date" value={draft.starts_on}
          onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} />
        <Input label="Ends" type="date" value={draft.ends_on}
          onChange={(e) => setDraft({ ...draft, ends_on: e.target.value })} />
      </div>
      <label style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.875rem", alignItems: "center" }}>
        <input type="checkbox" checked={draft.local_supplier}
          onChange={(e) => setDraft({ ...draft, local_supplier: e.target.checked })} />
        Local supplier
      </label>
      <label style={{ fontSize: "0.875rem", display: "block", marginTop: "0.5rem" }}>
        Summary (optional)
        <textarea value={draft.summary} rows={2}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          style={{ ...sel, resize: "vertical" }} />
      </label>
      <Button size="sm" onClick={submit}
        disabled={busy || !draft.title || !draft.supplier_name || !draft.value_cents
                  || !draft.starts_on || !draft.ends_on}
        style={{ marginTop: "0.5rem" }}>
        {busy ? "Awarding…" : "Award"}
      </Button>
    </div>
  );
}

const cell: React.CSSProperties = { padding: "0.5rem 0.625rem", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = {
  background: "var(--surface-muted)", textTransform: "uppercase",
  fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)",
};
const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "var(--brand)",
  cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600,
};
const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
