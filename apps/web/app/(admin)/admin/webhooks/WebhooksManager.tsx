"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type WebhookRow } from "@/lib/api";

const EVENT_OPTIONS = [
  "*",
  "report.created",
  "report.status_changed",
  "report.resolved",
  "rates.payment_received",
  "permit.issued",
  "land_hire.booked",
];

export function WebhooksManager({ token, initial }: { token: string; initial: WebhookRow[] }) {
  const [rows, setRows] = useState<WebhookRow[]>(initial);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["*"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      const w = await api<WebhookRow>("/api/admin/webhooks", {
        method: "POST", token, body: { url, event_types: events },
      });
      setRows((rs) => [...rs, w]);
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this webhook?")) return;
    await api(`/api/admin/webhooks/${id}`, { method: "DELETE", token });
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>New webhook</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Input
            label="Endpoint URL"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.yourstack.example/assembly/webhooks"
          />
          <div>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>Event types</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {EVENT_OPTIONS.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    background: events.includes(ev) ? "var(--brand)" : "var(--surface)",
                    color: events.includes(ev) ? "var(--brand-fg)" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-full)",
                    cursor: "pointer",
                  }}
                >{ev}</button>
              ))}
            </div>
          </div>
          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>{error}</p>}
          <Button onClick={add} disabled={busy || !url || events.length === 0}>
            {busy ? "Adding…" : "Add webhook"}
          </Button>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No webhooks configured.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((w) => (
            <li key={w.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, wordBreak: "break-all" }}>{w.url}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Events: {w.event_types.join(", ")} · Last status: {w.last_status ?? "—"}
                    </p>
                    <details style={{ marginTop: "0.375rem" }}>
                      <summary style={{ fontSize: "0.75rem", color: "var(--brand)", cursor: "pointer" }}>Show secret</summary>
                      <code style={{
                        display: "block", marginTop: "0.25rem", padding: "0.5rem",
                        background: "var(--surface-muted)", borderRadius: "var(--r-sm)",
                        fontSize: "0.75rem", wordBreak: "break-all",
                      }}>{w.secret}</code>
                    </details>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => remove(w.id)}>Delete</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
