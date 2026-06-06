"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type ObjectionRow } from "@/lib/api";

const COLOR: Record<string, string> = {
  lodged: "#C9A24B",
  review: "#1d4ed8",
  upheld: "#047857",
  dismissed: "#dc2626",
  withdrawn: "#6b7280",
};

export function ObjectionsQueue({ token, initial }: { token: string; initial: ObjectionRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(id: number, status: string) {
    setBusy(true);
    try {
      await api(`/api/staff/rates/objections/${id}`, {
        method: "PATCH", token, body: { status, decision_note: note || null },
      });
      setRows((rs) => rs.map((r) => r.id === id ? { ...r, status } : r));
      setOpen(null);
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {rows.map((o) => (
        <li key={o.id}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Objection #{o.id} ·{" "}
                  <Link href={`/staff/rates/property/${o.property_id}`}>Property {o.property_id}</Link>
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  FY{o.year} · {new Date(o.created_at).toLocaleDateString()}
                </p>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.875rem" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary)" }}>Current UV</p>
                    <p style={{ margin: 0, fontWeight: 600 }}><Money cents={o.current_uv_cents} /></p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary)" }}>Proposed UV</p>
                    <p style={{ margin: 0, fontWeight: 600 }}><Money cents={o.proposed_uv_cents} /></p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary)" }}>Δ</p>
                    <p style={{ margin: 0, fontWeight: 600,
                                 color: o.proposed_uv_cents < o.current_uv_cents ? "#047857" : "var(--danger)" }}>
                      {o.proposed_uv_cents < o.current_uv_cents ? "−" : "+"}
                      <Money cents={Math.abs(o.proposed_uv_cents - o.current_uv_cents)} />
                    </p>
                  </div>
                </div>
                <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", maxWidth: 640 }}>{o.grounds}</p>
              </div>
              <span style={{
                padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                background: COLOR[o.status] ?? "#6b7280",
                borderRadius: "var(--r-full)", alignSelf: "flex-start",
              }}>{o.status}</span>
            </div>
            {(o.status === "lodged" || o.status === "review") && (
              <>
                {open !== o.id && (
                  <Button size="sm" onClick={() => setOpen(o.id)} style={{ marginTop: "0.75rem" }}>
                    Decide
                  </Button>
                )}
                {open === o.id && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                      placeholder="Decision note (visible to ratepayer)"
                      style={{
                        width: "100%", padding: "0.5rem",
                        border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                        fontFamily: "inherit", resize: "vertical",
                      }} />
                    <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem" }}>
                      <Button size="sm" variant="secondary" onClick={() => decide(o.id, "review")} disabled={busy}>
                        Send to review
                      </Button>
                      <Button size="sm" onClick={() => decide(o.id, "upheld")} disabled={busy}>
                        Uphold
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => decide(o.id, "dismissed")} disabled={busy}>
                        Dismiss
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </li>
      ))}
      {rows.length === 0 && (
        <li><Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None.</p></Card></li>
      )}
    </ul>
  );
}
