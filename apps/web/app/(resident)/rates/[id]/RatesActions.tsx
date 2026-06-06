"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/env";

export function RatesActions({ propertyId, token }: { propertyId: number; token: string }) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text-secondary)",
                    margin: "0 0 0.75rem" }}>
        Rates actions
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "0.75rem" }}>
        <NoticeCard propertyId={propertyId} />
        <CertCard propertyId={propertyId} token={token} />
        <ObjectionCard propertyId={propertyId} token={token} />
        <HardshipCard propertyId={propertyId} token={token} />
      </div>
    </section>
  );
}

function NoticeCard({ propertyId }: { propertyId: number }) {
  return (
    <Card>
      <p style={{ margin: 0, fontWeight: 600 }}>Annual rates notice</p>
      <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
        Open the printable notice for this fiscal year.
      </p>
      <a href={`${API_BASE}/api/rates/properties/${propertyId}/notice`} target="_blank" rel="noreferrer"
        style={{ display: "inline-block", padding: "0.375rem 0.75rem",
                  background: "var(--brand)", color: "var(--brand-fg)",
                  borderRadius: "var(--r-md)", fontSize: "0.8125rem",
                  fontWeight: 600, textDecoration: "none" }}>
        Open notice →
      </a>
    </Card>
  );
}

function CertCard({ propertyId, token }: { propertyId: number; token: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ reference: string; fee_cents: number }>(
        `/api/rates/properties/${propertyId}/certificate-request`, {
        method: "POST", token,
        body: { requester_name: name || null, requester_email: email || null },
      });
      setDone(`Lodged — ${r.reference}. $${(r.fee_cents/100).toFixed(2)} fee on issue.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p style={{ margin: 0, fontWeight: 600 }}>Section 603 certificate</p>
      <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
        Settlement certificate of outstanding rates.
      </p>
      {done ? (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#047857", fontWeight: 600 }}>{done}</p>
      ) : open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Solicitor / requester name" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Notification email" type="email" />
          <div style={{ display: "flex", gap: "0.375rem" }}>
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "…" : "Request"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Request</Button>
      )}
    </Card>
  );
}

function ObjectionCard({ propertyId, token }: { propertyId: number; token: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [proposed, setProposed] = useState("");
  const [grounds, setGrounds] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const fy = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/rates/properties/${propertyId}/objections`, {
        method: "POST", token,
        body: {
          year: fy,
          current_uv_cents: Math.round(Number(current) * 100),
          proposed_uv_cents: Math.round(Number(proposed) * 100),
          grounds,
        },
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p style={{ margin: 0, fontWeight: 600 }}>Objection to valuation</p>
      <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
        Disagree with the Valuer General UV? Lodge it here.
      </p>
      {done ? (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#047857", fontWeight: 600 }}>
          ✓ Objection lodged. We&apos;ll be in touch.
        </p>
      ) : open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <Input value={current} onChange={(e) => setCurrent(e.target.value)}
            type="number" placeholder="Current UV ($)" />
          <Input value={proposed} onChange={(e) => setProposed(e.target.value)}
            type="number" placeholder="Proposed UV ($)" />
          <textarea value={grounds} onChange={(e) => setGrounds(e.target.value)} rows={3}
            placeholder="Grounds (min 20 chars)"
            style={{ padding: "0.5rem", border: "1px solid var(--border)",
                     borderRadius: "var(--r-md)", fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", gap: "0.375rem" }}>
            <Button size="sm" onClick={submit} disabled={busy || grounds.length < 20}>
              {busy ? "…" : "Lodge"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Object</Button>
      )}
    </Card>
  );
}

function HardshipCard({ propertyId, token }: { propertyId: number; token: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(6);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ monthly_amount_cents: number }>(
        `/api/rates/properties/${propertyId}/hardship-request`, {
        method: "POST", token,
        body: { term_months: Number(term), notes: notes || null },
      });
      setDone(`Requested. Monthly $${(r.monthly_amount_cents/100).toFixed(2)} — awaiting approval.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p style={{ margin: 0, fontWeight: 600 }}>Hardship payment plan</p>
      <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
        Spread your balance across 3–12 monthly instalments.
      </p>
      {done ? (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#047857", fontWeight: 600 }}>{done}</p>
      ) : open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={{ fontSize: "0.8125rem" }}>
            Term (months)
            <input type="number" min={3} max={12} value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              style={{ marginLeft: "0.5rem", width: 64, padding: "0.25rem 0.5rem",
                       border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }} />
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Optional notes about your circumstances"
            style={{ padding: "0.5rem", border: "1px solid var(--border)",
                     borderRadius: "var(--r-md)", fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", gap: "0.375rem" }}>
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "…" : "Request"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Request plan</Button>
      )}
    </Card>
  );
}
