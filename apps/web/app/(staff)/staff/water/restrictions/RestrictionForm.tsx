"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type WaterRestrictionRow } from "@/lib/api";

const COLOR: Record<number, string> = {
  0: "#047857", 1: "#22c55e", 2: "#C9A24B",
  3: "#f97316", 4: "#dc2626", 5: "#991b1b",
};

export function RestrictionForm({ token, initial }: {
  token: string; initial: WaterRestrictionRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [level, setLevel] = useState(1);
  const [starts, setStarts] = useState(new Date().toISOString().slice(0, 16));
  const [ends, setEnds] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ id: number }>("/api/staff/water/restrictions", {
        method: "POST", token,
        body: {
          level, starts_at: new Date(starts).toISOString(),
          ends_at: ends ? new Date(ends).toISOString() : null,
          summary: summary || null,
        },
      });
      setRows((rs) => [{
        id: r.id, level, summary: summary || `Level ${level} water restrictions`,
        rules: [], starts_at: new Date(starts).toISOString(),
        ends_at: ends ? new Date(ends).toISOString() : null,
        affected_wards: null,
      }, ...rs]);
      setSummary("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Set new restriction</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.375rem",
                       marginBottom: "0.75rem" }}>
          {[0, 1, 2, 3, 4, 5].map((lv) => (
            <button key={lv} type="button" onClick={() => setLevel(lv)}
              style={{
                padding: "0.75rem 0", fontSize: "0.875rem", fontWeight: 700,
                background: level === lv ? COLOR[lv] : "var(--surface)",
                color: level === lv ? "#fff" : "var(--text-primary)",
                border: `2px solid ${level === lv ? COLOR[lv] : "var(--border)"}`,
                borderRadius: "var(--r-md)", cursor: "pointer",
                fontFamily: "inherit",
              }}>L{lv}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <Input label="Starts" type="datetime-local" value={starts}
            onChange={(e) => setStarts(e.target.value)} />
          <Input label="Ends (optional)" type="datetime-local" value={ends}
            onChange={(e) => setEnds(e.target.value)} />
        </div>
        <Input label="Summary (optional)" value={summary}
          onChange={(e) => setSummary(e.target.value)} />
        <Button onClick={submit} disabled={busy} style={{ marginTop: "0.75rem" }}>
          {busy ? "Setting…" : `Set Level ${level} restrictions`}
        </Button>
      </Card>

      <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text-secondary)",
                    margin: "1.25rem 0 0.5rem" }}>
        Restriction history
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0,
                   display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map((r) => (
          <li key={r.id}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{r.summary}</p>
                <span style={{
                  padding: "0.125rem 0.5rem", color: "#fff", fontSize: "0.7rem", fontWeight: 700,
                  background: COLOR[r.level], borderRadius: "var(--r-full)",
                }}>LEVEL {r.level}</span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {new Date(r.starts_at).toLocaleString()}
                {r.ends_at && ` → ${new Date(r.ends_at).toLocaleString()}`}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
