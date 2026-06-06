"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

const ISSUES = [
  { code: "cracked", label: "Cracked" },
  { code: "raised", label: "Raised / lifted" },
  { code: "missing", label: "Missing section" },
  { code: "narrow", label: "Too narrow" },
  { code: "no_kerb_ramp", label: "No kerb ramp" },
  { code: "obstructed", label: "Obstructed" },
];

const GRADES = [
  { code: "good", label: "Good" },
  { code: "fair", label: "Fair" },
  { code: "poor", label: "Poor" },
  { code: "impassable", label: "Impassable" },
];

export function FootpathReporter({ token }: { token: string }) {
  const [issue, setIssue] = useState("cracked");
  const [grade, setGrade] = useState("fair");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const pos = await new Promise<{ lat: number; lng: number }>((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("Geolocation unavailable — open this page on your phone"));
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
          rej, { timeout: 6000 },
        );
      });
      await api("/api/footpath/audits", {
        method: "POST", token,
        body: { lat: pos.lat, lng: pos.lng, issue, grade, notes: notes || null },
      });
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label style={{ fontSize: "0.875rem" }}>
        Issue
        <select value={issue} onChange={(e) => setIssue(e.target.value)} style={selectStyle}>
          {ISSUES.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: "0.875rem" }}>
        How walkable?
        <select value={grade} onChange={(e) => setGrade(e.target.value)} style={selectStyle}>
          {GRADES.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: "0.875rem" }}>
        Notes (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          style={{ ...selectStyle, resize: "vertical" }} />
      </label>
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
      <Button onClick={submit} disabled={busy}>
        {busy ? "Submitting…" : "Log here (uses your GPS)"}
      </Button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
