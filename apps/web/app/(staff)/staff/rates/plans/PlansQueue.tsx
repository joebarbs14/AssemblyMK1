"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type HardshipPlanRow } from "@/lib/api";

const COLOR: Record<string, string> = {
  requested: "#C9A24B",
  active: "#047857",
  completed: "#1d4ed8",
  defaulted: "#dc2626",
  cancelled: "#6b7280",
};

export function PlansQueue({ token, initial }: { token: string; initial: HardshipPlanRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function approve(id: number) {
    setBusy(id);
    try {
      await api(`/api/staff/rates/plans/${id}/approve`, { method: "POST", token });
      setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: "active" } : r));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
        <thead>
          <tr style={head}>
            <th style={cell}>Account</th>
            <th style={cell}>Term</th>
            <th style={cell}>Monthly</th>
            <th style={cell}>Period</th>
            <th style={cell}>Paid</th>
            <th style={cell}>Status</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ ...cell, fontFamily: "monospace" }}>#{p.account_id}</td>
              <td style={cell}>{p.term_months} mo</td>
              <td style={cell}><Money cents={p.monthly_amount_cents} /></td>
              <td style={cell}>
                {new Date(p.starts_on).toLocaleDateString()} → {new Date(p.ends_on).toLocaleDateString()}
              </td>
              <td style={cell}>{p.paid_count}/{p.term_months}</td>
              <td style={cell}>
                <span style={{
                  padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                  background: COLOR[p.status] ?? "#6b7280",
                  borderRadius: "var(--r-full)",
                }}>{p.status}</span>
              </td>
              <td style={cell}>
                {p.status === "requested" && (
                  <Button size="sm" onClick={() => approve(p.id)} disabled={busy === p.id}>
                    {busy === p.id ? "…" : "Approve"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} style={{ ...cell, color: "var(--text-secondary)", textAlign: "center" }}>
              No plans.
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
