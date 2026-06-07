"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type CertificateRow } from "@/lib/api";
import { API_BASE } from "@/lib/env";

const COLOR: Record<string, string> = {
  requested: "#C9A24B",
  paid: "#1d4ed8",
  issued: "#047857",
  cancelled: "#6b7280",
};

export function CertificateQueue({ token, initial }: { token: string; initial: CertificateRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function issue(id: number) {
    if (!confirm("Issue this certificate? The snapshot will be locked in.")) return;
    setBusy(id);
    try {
      await api(`/api/staff/rates/certificates/${id}/issue`, { method: "POST", token });
      setRows((rs) => rs.map((r) => r.id === id
        ? { ...r, status: "issued", issued_at: new Date().toISOString() }
        : r));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
        <thead>
          <tr style={head}>
            <th style={cell}>Ref</th>
            <th style={cell}>Requester</th>
            <th style={cell}>Fee</th>
            <th style={cell}>Requested</th>
            <th style={cell}>Status</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ ...cell, fontFamily: "monospace" }}>{c.reference}</td>
              <td style={cell}>
                {c.requester_name ?? "—"}
                {c.requester_email && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{c.requester_email}</div>
                )}
              </td>
              <td style={cell}><Money cents={c.fee_cents} /></td>
              <td style={cell}>{new Date(c.created_at).toLocaleDateString()}</td>
              <td style={cell}>
                <span style={{
                  padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                  background: COLOR[c.status] ?? "#6b7280",
                  borderRadius: "var(--r-full)",
                }}>{c.status}</span>
              </td>
              <td style={cell}>
                <a href={`${API_BASE}/api/staff/rates/certificates/${c.id}/preview`}
                  target="_blank" rel="noreferrer" style={linkBtn}>Preview</a>
                {c.status !== "issued" && c.status !== "cancelled" && (
                  <>
                    {" · "}
                    <button onClick={() => issue(c.id)} disabled={busy === c.id} style={linkBtn}>
                      {busy === c.id ? "…" : "Issue"}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} style={{ ...cell, color: "var(--text-secondary)", textAlign: "center" }}>
              No certificate requests yet.
            </td></tr>
          )}
        </tbody>
      </table>
    </Card>
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
  textDecoration: "none",
};
