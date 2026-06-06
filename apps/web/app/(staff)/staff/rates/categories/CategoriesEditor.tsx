"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { api, type RateCategoryRow } from "@/lib/api";

interface Draft {
  id?: number;
  fiscal_year: number;
  code: string;
  label: string;
  ad_valorem_cents_per_dollar: string;  // string for input
  base_amount_cents: string;             // $
  minimum_cents: string;                 // $
  notes: string;
}

const EMPTY: Draft = {
  fiscal_year: new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1,
  code: "residential",
  label: "Residential",
  ad_valorem_cents_per_dollar: "0.003421",
  base_amount_cents: "0",
  minimum_cents: "735",
  notes: "",
};

const CODES = ["residential", "business", "farmland", "mining",
                "primary_production", "sub_residential", "sub_business"];

export function CategoriesEditor({ token, initial }: {
  token: string; initial: RateCategoryRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const body = {
        fiscal_year: Number(draft.fiscal_year),
        code: draft.code, label: draft.label,
        ad_valorem_cents_per_dollar: Number(draft.ad_valorem_cents_per_dollar),
        base_amount_cents: Math.round(Number(draft.base_amount_cents) * 100),
        minimum_cents: Math.round(Number(draft.minimum_cents) * 100),
        notes: draft.notes || null,
      };
      if (draft.id) {
        const r = await api<RateCategoryRow>(`/api/staff/rates/categories/${draft.id}`,
          { method: "PUT", token, body });
        setRows((rs) => rs.map((x) => x.id === draft.id ? r : x));
      } else {
        const r = await api<RateCategoryRow>("/api/staff/rates/categories",
          { method: "POST", token, body });
        setRows((rs) => [r, ...rs]);
      }
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this category? Properties already struck under it are unaffected.")) return;
    await api(`/api/staff/rates/categories/${id}`, { method: "DELETE", token });
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function edit(c: RateCategoryRow) {
    setDraft({
      id: c.id, fiscal_year: c.fiscal_year, code: c.code, label: c.label,
      ad_valorem_cents_per_dollar: c.ad_valorem_cents_per_dollar.toString(),
      base_amount_cents: (c.base_amount_cents / 100).toString(),
      minimum_cents: (c.minimum_cents / 100).toString(),
      notes: c.notes ?? "",
    });
  }

  // Group by FY
  const byFy: Record<number, RateCategoryRow[]> = {};
  for (const r of rows) (byFy[r.fiscal_year] ??= []).push(r);
  const years = Object.keys(byFy).map(Number).sort((a, b) => b - a);

  return (
    <>
      {!draft && <Button onClick={() => setDraft(EMPTY)} style={{ marginBottom: "1rem" }}>+ New category</Button>}

      {draft && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>
            {draft.id ? "Edit category" : "New category"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <Input label="Fiscal year" type="number" value={String(draft.fiscal_year)}
              onChange={(e) => setDraft({ ...draft, fiscal_year: Number(e.target.value) })} />
            <label style={{ fontSize: "0.875rem" }}>
              Code
              <select value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                style={sel}>
                {CODES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <Input label="Label" value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Input label="Ad valorem ($/$)" type="number" step="0.000001"
              value={draft.ad_valorem_cents_per_dollar}
              hint={`= ${(Number(draft.ad_valorem_cents_per_dollar) * 1000).toFixed(4)}¢ per $1,000 UV`}
              onChange={(e) => setDraft({ ...draft, ad_valorem_cents_per_dollar: e.target.value })} />
            <Input label="Base ($/year)" type="number"
              value={draft.base_amount_cents}
              onChange={(e) => setDraft({ ...draft, base_amount_cents: e.target.value })} />
            <Input label="Minimum ($/year)" type="number"
              value={draft.minimum_cents}
              onChange={(e) => setDraft({ ...draft, minimum_cents: e.target.value })} />
          </div>
          <label style={{ fontSize: "0.875rem", display: "block", marginTop: "0.5rem" }}>
            Notes
            <textarea value={draft.notes} rows={2}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              style={{ ...sel, resize: "vertical" }} />
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <Button onClick={save} disabled={busy || !draft.label || !draft.code}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {years.map((fy) => (
        <section key={fy} style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-secondary)",
                        margin: "0 0 0.5rem" }}>
            FY{fy}
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={head}>
                  <th style={cell}>Code</th>
                  <th style={cell}>Label</th>
                  <th style={cell}>Ad valorem</th>
                  <th style={cell}>Base</th>
                  <th style={cell}>Minimum</th>
                  <th style={cell} />
                </tr>
              </thead>
              <tbody>
                {byFy[fy].map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ ...cell, fontFamily: "monospace" }}>{c.code}</td>
                    <td style={cell}>{c.label}</td>
                    <td style={{ ...cell, fontFamily: "monospace" }}>
                      {c.ad_valorem_cents_per_dollar.toFixed(6)}
                    </td>
                    <td style={cell}><Money cents={c.base_amount_cents} /></td>
                    <td style={cell}><Money cents={c.minimum_cents} /></td>
                    <td style={cell}>
                      <button onClick={() => edit(c)} style={linkBtn}>Edit</button>
                      {" · "}
                      <button onClick={() => remove(c.id)} style={{ ...linkBtn, color: "var(--danger)" }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      ))}
    </>
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
