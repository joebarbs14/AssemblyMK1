"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { api, type RateLevyRow } from "@/lib/api";

const CODES = ["stormwater", "dwm", "environmental_levy", "special_rate"];
const KINDS = ["fixed", "per_bin", "per_sqm"];

interface Draft {
  fiscal_year: number;
  code: string;
  label: string;
  kind: string;
  amount: string;
  applies_to_property_type: string;
  notes: string;
}

const fyNow = new Date().getMonth() >= 6
  ? new Date().getFullYear() : new Date().getFullYear() - 1;

const EMPTY: Draft = {
  fiscal_year: fyNow, code: "stormwater", label: "Stormwater management",
  kind: "fixed", amount: "25", applies_to_property_type: "", notes: "",
};

export function LeviesEditor({ token, initial }: { token: string; initial: RateLevyRow[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const r = await api<RateLevyRow>("/api/staff/rates/levies", {
        method: "POST", token,
        body: {
          fiscal_year: Number(draft.fiscal_year),
          code: draft.code, label: draft.label, kind: draft.kind,
          amount_cents: Math.round(Number(draft.amount) * 100),
          applies_to_property_type: draft.applies_to_property_type || null,
          notes: draft.notes || null,
        },
      });
      setRows((rs) => [r, ...rs]);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this levy?")) return;
    await api(`/api/staff/rates/levies/${id}`, { method: "DELETE", token });
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const byFy: Record<number, RateLevyRow[]> = {};
  for (const r of rows) (byFy[r.fiscal_year] ??= []).push(r);
  const years = Object.keys(byFy).map(Number).sort((a, b) => b - a);

  return (
    <>
      {!draft && <Button onClick={() => setDraft(EMPTY)} style={{ marginBottom: "1rem" }}>+ New levy</Button>}

      {draft && (
        <Card style={{ marginBottom: "1rem" }}>
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
            <label style={{ fontSize: "0.875rem" }}>
              Kind
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                style={sel}>
                {KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Input label="Label" value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <Input label={`Amount${draft.kind === "per_bin" ? " ($/bin)" : draft.kind === "per_sqm" ? " ($/m²)" : " ($/yr)"}`}
              type="number" step="0.01" value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            <Input label="Applies to property type (csv)" value={draft.applies_to_property_type}
              hint="Blank = all. e.g. primary,investment"
              onChange={(e) => setDraft({ ...draft, applies_to_property_type: e.target.value })} />
          </div>
          <Input label="Notes" value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <Button onClick={save} disabled={busy || !draft.label}>
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
                        margin: "0 0 0.5rem" }}>FY{fy}</h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={head}>
                  <th style={cell}>Code</th>
                  <th style={cell}>Label</th>
                  <th style={cell}>Kind</th>
                  <th style={{ ...cell, textAlign: "right" }}>Amount</th>
                  <th style={cell}>Applies to</th>
                  <th style={cell} />
                </tr>
              </thead>
              <tbody>
                {byFy[fy].map((lv) => (
                  <tr key={lv.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ ...cell, fontFamily: "monospace" }}>{lv.code}</td>
                    <td style={cell}>{lv.label}</td>
                    <td style={cell}>{lv.kind}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      <Money cents={lv.amount_cents} />
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
                        {lv.kind === "per_bin" ? "/bin" : lv.kind === "per_sqm" ? "/m²" : "/yr"}
                      </span>
                    </td>
                    <td style={cell}>{lv.applies_to_property_type ?? "—"}</td>
                    <td style={cell}>
                      <button onClick={() => remove(lv.id)} style={linkBtn}>Delete</button>
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
  background: "none", border: "none", color: "var(--danger)",
  cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600,
};
const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
