"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type WaterTariffRow } from "@/lib/api";

const TYPES = ["residential", "commercial", "rural"];
const fyNow = new Date().getMonth() >= 6
  ? new Date().getFullYear() : new Date().getFullYear() - 1;

interface Draft {
  fiscal_year: number;
  customer_type: string;
  tier_from_kl: string;
  tier_to_kl: string;
  cents_per_kl: string;
  label: string;
}

const EMPTY: Draft = {
  fiscal_year: fyNow, customer_type: "residential",
  tier_from_kl: "0", tier_to_kl: "200", cents_per_kl: "120",
  label: "Step 1",
};

export function TariffsEditor({ token, initial }: { token: string; initial: WaterTariffRow[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const r = await api<WaterTariffRow>("/api/staff/water/tariffs", {
        method: "POST", token,
        body: {
          fiscal_year: Number(draft.fiscal_year),
          customer_type: draft.customer_type,
          tier_from_kl: Number(draft.tier_from_kl),
          tier_to_kl: draft.tier_to_kl ? Number(draft.tier_to_kl) : null,
          cents_per_kl: Number(draft.cents_per_kl),
          label: draft.label || null,
        },
      });
      setRows((rs) => [r, ...rs]);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this tier?")) return;
    await api(`/api/staff/water/tariffs/${id}`, { method: "DELETE", token });
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const groups: Record<string, WaterTariffRow[]> = {};
  for (const r of rows) {
    const k = `${r.fiscal_year}-${r.customer_type}`;
    (groups[k] ??= []).push(r);
  }
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <>
      {!draft && <Button onClick={() => setDraft(EMPTY)} style={{ marginBottom: "1rem" }}>+ New tier</Button>}

      {draft && (
        <Card style={{ marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <Input label="Fiscal year" type="number" value={String(draft.fiscal_year)}
              onChange={(e) => setDraft({ ...draft, fiscal_year: Number(e.target.value) })} />
            <label style={{ fontSize: "0.875rem" }}>
              Customer type
              <select value={draft.customer_type}
                onChange={(e) => setDraft({ ...draft, customer_type: e.target.value })}
                style={sel}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <Input label="Label" value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Input label="From kL" type="number" value={draft.tier_from_kl}
              onChange={(e) => setDraft({ ...draft, tier_from_kl: e.target.value })} />
            <Input label="To kL (blank = top tier)" type="number" value={draft.tier_to_kl}
              onChange={(e) => setDraft({ ...draft, tier_to_kl: e.target.value })} />
            <Input label="Cents per kL" type="number" value={draft.cents_per_kl}
              onChange={(e) => setDraft({ ...draft, cents_per_kl: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {keys.map((k) => (
        <section key={k} style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-secondary)",
                        margin: "0 0 0.5rem" }}>
            FY{groups[k][0].fiscal_year} · {groups[k][0].customer_type}
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={head}>
                  <th style={cell}>Label</th>
                  <th style={cell}>From kL</th>
                  <th style={cell}>To kL</th>
                  <th style={{ ...cell, textAlign: "right" }}>$/kL</th>
                  <th style={cell} />
                </tr>
              </thead>
              <tbody>
                {groups[k].map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={cell}>{r.label ?? "—"}</td>
                    <td style={cell}>{r.tier_from_kl}</td>
                    <td style={cell}>{r.tier_to_kl ?? "∞"}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      ${(r.cents_per_kl / 100).toFixed(3)}
                    </td>
                    <td style={cell}>
                      <button onClick={() => remove(r.id)} style={del}>Delete</button>
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
const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
const del: React.CSSProperties = {
  background: "none", border: "none", color: "var(--danger)",
  cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600,
};
