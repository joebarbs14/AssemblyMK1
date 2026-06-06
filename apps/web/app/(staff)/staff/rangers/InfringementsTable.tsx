"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type InfringementRow } from "@/lib/api";

interface Code { code: string; desc: string; fee_cents: number }

export function InfringementsTable({ token, initial, kinds, codes }: {
  token: string; initial: InfringementRow[];
  kinds: string[]; codes: Record<string, Code[]>;
}) {
  const [rows, setRows] = useState<InfringementRow[]>(initial);
  const [kind, setKind] = useState(kinds[0]);
  const [code, setCode] = useState<Code>(codes[kinds[0]][0]);
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      let pos: { lat: number; lng: number } | null = null;
      if (navigator.geolocation) {
        try {
          pos = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(
              (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
              rej,
              { timeout: 4000 },
            );
          });
        } catch {
          pos = null;
        }
      }
      const inf = await api<InfringementRow>("/api/rangers/infringements", {
        method: "POST", token,
        body: {
          kind, code: code.code, description: code.desc,
          plate: plate || null, lat: pos?.lat ?? null, lng: pos?.lng ?? null,
          fee_cents: code.fee_cents,
        },
      });
      setRows((r) => [inf, ...r]);
      setPlate("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Issue infringement</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.875rem" }}>
            Kind
            <select value={kind} onChange={(e) => { setKind(e.target.value); setCode(codes[e.target.value][0]); }}
              style={{
                marginTop: "0.25rem", width: "100%", padding: "0.5rem", borderRadius: "var(--r-md)",
                border: "1px solid var(--border)", background: "var(--surface)", fontFamily: "inherit",
              }}>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label style={{ fontSize: "0.875rem" }}>
            Offence
            <select
              value={code.code}
              onChange={(e) => setCode(codes[kind].find((c) => c.code === e.target.value) ?? codes[kind][0])}
              style={{
                marginTop: "0.25rem", width: "100%", padding: "0.5rem", borderRadius: "var(--r-md)",
                border: "1px solid var(--border)", background: "var(--surface)", fontFamily: "inherit",
              }}
            >
              {codes[kind].map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.desc} (${(c.fee_cents / 100).toFixed(2)})
                </option>
              ))}
            </select>
          </label>
          <Input label="Plate / animal tag (optional)" value={plate} onChange={(e) => setPlate(e.target.value)} />
          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>{error}</p>}
          <Button onClick={issue} disabled={busy}>
            {busy ? "Issuing…" : `Issue ($${(code.fee_cents / 100).toFixed(2)})`}
          </Button>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Geo-location captured automatically when available.
          </p>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Issued</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Kind</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Code</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Plate</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Fee</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>{new Date(r.issued_at).toLocaleString()}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{r.kind}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{r.code}</td>
                <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace" }}>{r.plate ?? "—"}</td>
                <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${(r.fee_cents / 100).toFixed(2)}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
