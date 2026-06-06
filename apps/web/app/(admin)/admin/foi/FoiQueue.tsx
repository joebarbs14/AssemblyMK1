"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { api, type FoiQueueRow } from "@/lib/api";

const STATUSES = ["received", "assessing", "fees_quoted", "decided", "released", "refused", "withdrawn"];

const COLOR: Record<string, string> = {
  received: "#6b7280",
  assessing: "#C9A24B",
  fees_quoted: "#C9A24B",
  decided: "#047857",
  released: "#047857",
  refused: "#dc2626",
  withdrawn: "#6b7280",
};

export function FoiQueue({ token, initial }: { token: string; initial: FoiQueueRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<string>("");

  const visible = filter ? rows.filter((r) => r.status === filter) : rows;

  async function setStatus(id: number, status: string) {
    const r = await api<{ status: string }>(`/api/admin/foi/${id}`, {
      method: "PATCH", token, body: { status },
    });
    setRows((rs) => rs.map((row) => row.id === id ? { ...row, status: r.status } : row));
  }

  return (
    <>
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <FilterChip active={filter === ""} onClick={() => setFilter("")} label={`All (${rows.length})`} />
        {STATUSES.map((s) => {
          const n = rows.filter((r) => r.status === s).length;
          if (n === 0) return null;
          return <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={`${s.replace("_", " ")} (${n})`} />;
        })}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", textTransform: "uppercase",
                          fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>
              <th style={cell}>Ref</th>
              <th style={cell}>Title</th>
              <th style={cell}>Requester</th>
              <th style={cell}>Due</th>
              <th style={cell}>Status</th>
              <th style={cell}>Advance</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const nextStates = nextFor(r.status);
              return (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ ...cell, fontFamily: "monospace" }}>{r.reference}</td>
                  <td style={cell}>
                    <strong>{r.title}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      {r.kind}
                    </p>
                  </td>
                  <td style={cell}>{r.requester_email ?? "—"}</td>
                  <td style={{ ...cell, color: r.overdue ? "var(--danger)" : undefined,
                               fontWeight: r.overdue ? 600 : undefined }}>
                    {new Date(r.due_by).toLocaleDateString()}
                    {r.overdue && " ⚠"}
                  </td>
                  <td style={cell}>
                    <span style={{
                      padding: "0.125rem 0.5rem", fontSize: "0.65rem", fontWeight: 700,
                      textTransform: "uppercase", color: "#fff",
                      background: COLOR[r.status] ?? "#6b7280",
                      borderRadius: "var(--r-full)",
                    }}>{r.status.replace("_", " ")}</span>
                  </td>
                  <td style={cell}>
                    {nextStates.length > 0 && (
                      <select value=""
                        onChange={(e) => e.target.value && setStatus(r.id, e.target.value)}
                        style={{
                          padding: "0.25rem 0.5rem", fontSize: "0.8125rem",
                          border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                          background: "var(--surface)", fontFamily: "inherit",
                        }}>
                        <option value="">Move to…</option>
                        {nextStates.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function nextFor(s: string): string[] {
  switch (s) {
    case "received": return ["assessing", "fees_quoted", "withdrawn"];
    case "assessing": return ["fees_quoted", "decided", "released", "refused"];
    case "fees_quoted": return ["assessing", "decided", "withdrawn"];
    case "decided": return ["released", "refused"];
    default: return [];
  }
}

const cell: React.CSSProperties = { padding: "0.5rem 0.625rem", textAlign: "left", verticalAlign: "top" };

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "0.25rem 0.625rem", fontSize: "0.75rem", fontWeight: 600,
      background: active ? "var(--brand)" : "var(--surface)",
      color: active ? "var(--brand-fg)" : "var(--text-primary)",
      border: "1px solid var(--border)", borderRadius: "var(--r-full)",
      cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );
}
