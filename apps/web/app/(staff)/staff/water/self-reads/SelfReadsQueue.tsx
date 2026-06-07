"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

interface SelfReadRow {
  id: number; property_id: number; address: string;
  read_on: string; value_kl: number; status: string;
  photo_r2_key: string | null; note: string | null;
  submitted_by_user_id: number; created_at: string;
}

export function SelfReadsQueue({ token, initial }: {
  token: string; initial: SelfReadRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(id: number, status: "accepted" | "disputed", note: string | null) {
    setBusy(id);
    try {
      await api(`/api/staff/water/self-reads/${id}`, {
        method: "PATCH", token, body: { status, note },
      });
      setRows((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0,
                 display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {rows.map((r) => (
        <li key={r.id}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{r.address}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.875rem" }}>
                  <strong>{r.value_kl.toFixed(2)} kL</strong> · read{" "}
                  {new Date(r.read_on).toLocaleDateString()}
                </p>
                {r.note && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem",
                               color: "var(--text-secondary)" }}>“{r.note}”</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.375rem", alignItems: "flex-start" }}>
                <Button size="sm" onClick={() => decide(r.id, "accepted", null)} disabled={busy === r.id}>
                  Accept
                </Button>
                <Button size="sm" variant="danger"
                  onClick={() => {
                    const why = prompt("Why is this read disputed?");
                    if (why) decide(r.id, "disputed", why);
                  }}
                  disabled={busy === r.id}>
                  Dispute
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
      {rows.length === 0 && (
        <li><Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>
          No reads awaiting review.
        </p></Card></li>
      )}
    </ul>
  );
}
