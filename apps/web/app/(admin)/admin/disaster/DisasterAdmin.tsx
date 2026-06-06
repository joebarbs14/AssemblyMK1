"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  api,
  type DisasterAlertRow,
  type EvacCentreRow,
  type FireBanRow,
  type SandbagDepotRow,
} from "@/lib/api";

export function DisasterAdmin({ token, alerts, evac, sandbags, ban }: {
  token: string;
  alerts: DisasterAlertRow[];
  evac: EvacCentreRow[];
  sandbags: SandbagDepotRow[];
  ban: FireBanRow | null;
}) {
  return (
    <>
      <AlertsSection token={token} initial={alerts} />
      <FireBanSection token={token} initial={ban} />
      <EvacSection token={token} initial={evac} />
      <SandbagSection token={token} initial={sandbags} />
    </>
  );
}

function AlertsSection({ token, initial }: { token: string; initial: DisasterAlertRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("storm");
  const [sev, setSev] = useState("watch");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const r = await api<{ id: number }>("/api/admin/disaster/alerts", {
        method: "POST", token,
        body: {
          kind, severity: sev, title, body,
          starts_at: new Date(starts).toISOString(),
          ends_at: ends ? new Date(ends).toISOString() : null,
        },
      });
      setRows((rs) => [{
        id: r.id, kind, severity: sev, title, body,
        source: "council",
        starts_at: new Date(starts).toISOString(),
        ends_at: ends ? new Date(ends).toISOString() : null,
      }, ...rs]);
      setTitle(""); setBody(""); setStarts(""); setEnds(""); setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Active alerts">
      <Button size="sm" onClick={() => setOpen((o) => !o)} style={{ marginBottom: "0.5rem" }}>
        {open ? "Cancel" : "+ Post alert"}
      </Button>
      {open && (
        <Card style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem" }}>
              Kind
              <select value={kind} onChange={(e) => setKind(e.target.value)} style={sel}>
                {["bushfire","flood","storm","heatwave","cyclone"].map((k) => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.875rem" }}>
              Severity
              <select value={sev} onChange={(e) => setSev(e.target.value)} style={sel}>
                {["advice","watch","emergency"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label style={{ fontSize: "0.875rem", display: "block", marginTop: "0.5rem" }}>
            Body
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} style={sel} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Input label="Starts" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
            <Input label="Ends (optional)" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </div>
          <Button size="sm" onClick={create} disabled={busy || !title || !body || !starts} style={{ marginTop: "0.5rem" }}>
            {busy ? "Posting…" : "Publish"}
          </Button>
        </Card>
      )}
      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No active alerts.</p></Card>
      ) : (
        <ul style={listStyle}>
          {rows.map((a) => (
            <li key={a.id}>
              <Card>
                <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                             textTransform: "uppercase", color: "var(--text-secondary)" }}>
                  {a.severity} · {a.kind} · {a.source}
                </p>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>{a.title}</p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>{a.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function FireBanSection({ token, initial }: { token: string; initial: FireBanRow | null }) {
  const [ban, setBan] = useState(initial);
  const [rating, setRating] = useState("high");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function declare() {
    setBusy(true);
    try {
      const r = await api<{ id: number }>("/api/admin/fire-bans", {
        method: "POST", token,
        body: {
          rating,
          declared_at: new Date(starts).toISOString(),
          ends_at: new Date(ends).toISOString(),
          note: note || null,
        },
      });
      setBan({ id: r.id, rating, declared_at: new Date(starts).toISOString(),
               ends_at: new Date(ends).toISOString(), source: "council", note });
    } finally {
      setBusy(false);
    }
  }

  async function lift() {
    if (!ban) return;
    if (!confirm("Lift the fire ban immediately?")) return;
    await api(`/api/admin/fire-bans/${ban.id}/lift`, { method: "POST", token });
    setBan(null);
  }

  return (
    <Section title="Fire ban">
      {ban ? (
        <Card>
          <p style={{ margin: 0, fontWeight: 600 }}>
            <span style={{ textTransform: "uppercase", color: "#dc2626" }}>{ban.rating}</span>
            {" "}until {new Date(ban.ends_at).toLocaleString()}
          </p>
          {ban.note && <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.875rem" }}>{ban.note}</p>}
          <Button size="sm" variant="danger" onClick={lift}>Lift now</Button>
        </Card>
      ) : (
        <Card>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            No current ban. Declare one — burn permits are auto-blocked at extreme/catastrophic.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem" }}>
              Rating
              <select value={rating} onChange={(e) => setRating(e.target.value)} style={sel}>
                {["moderate","high","extreme","catastrophic"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <Input label="From" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
            <Input label="Until" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </div>
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" onClick={declare} disabled={busy || !starts || !ends} style={{ marginTop: "0.5rem" }}>
            {busy ? "Declaring…" : "Declare ban"}
          </Button>
        </Card>
      )}
    </Section>
  );
}

function EvacSection({ token, initial }: { token: string; initial: EvacCentreRow[] }) {
  const [rows, setRows] = useState(initial);

  async function setStatus(id: number, status: string) {
    await api(`/api/admin/disaster/evac-centres/${id}`, {
      method: "PATCH", token, body: { status },
    });
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status } : r));
  }

  return (
    <Section title="Evacuation centres">
      <ul style={listStyle}>
        {rows.map((e) => (
          <li key={e.id}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{e.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {e.address} · cap. {e.capacity ?? "—"}
                  </p>
                </div>
                <select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)}
                  style={{ ...sel, marginTop: 0, width: 140 }}>
                  {["standby","open","full","closed"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function SandbagSection({ token, initial }: { token: string; initial: SandbagDepotRow[] }) {
  const [rows, setRows] = useState(initial);

  async function setBags(id: number, n: number) {
    await api(`/api/admin/disaster/sandbags/${id}`, {
      method: "PATCH", token, body: { bags_available: n },
    });
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, bags_available: n } : r));
  }

  return (
    <Section title="Sandbag depots">
      <ul style={listStyle}>
        {rows.map((s) => (
          <li key={s.id}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{s.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{s.address}</p>
                </div>
                <input type="number" min={0} value={s.bags_available}
                  onChange={(e) => setBags(s.id, Number(e.target.value))}
                  style={{ width: 100, padding: "0.375rem 0.5rem",
                           border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                           fontFamily: "inherit" }} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};

const listStyle: React.CSSProperties = {
  listStyle: "none", padding: 0, margin: 0,
  display: "flex", flexDirection: "column", gap: "0.5rem",
};
