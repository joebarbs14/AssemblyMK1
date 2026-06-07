"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { api, type WaterEstimate } from "@/lib/api";

export function BillEstimator({ token }: { token: string }) {
  const [kl, setKl] = useState("50");
  const [ctype, setCtype] = useState("residential");
  const [result, setResult] = useState<WaterEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compute() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<WaterEstimate>("/api/water/estimate", {
        method: "POST", token,
        body: { consumed_kl: Number(kl), customer_type: ctype },
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <label style={{ fontSize: "0.875rem" }}>
          Volume (kL)
          <input type="number" min={0} value={kl}
            onChange={(e) => setKl(e.target.value)}
            style={inp} />
        </label>
        <label style={{ fontSize: "0.875rem" }}>
          Customer type
          <select value={ctype} onChange={(e) => setCtype(e.target.value)} style={inp}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="rural">Rural</option>
          </select>
        </label>
      </div>
      <input type="range" min={0} max={1000} step={5} value={kl}
        onChange={(e) => setKl(e.target.value)} />
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
      <Button size="sm" onClick={compute} disabled={busy}>
        {busy ? "Calculating…" : "Estimate bill"}
      </Button>

      {result && (
        <div style={{ marginTop: "0.75rem", padding: "0.75rem",
                       background: "var(--surface-muted)", borderRadius: "var(--r-md)" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {result.total_kl} kL · FY{result.fiscal_year} · {result.customer_type}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0",
                        fontSize: "0.875rem" }}>
            {result.tiers.map((t, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {t.from_kl}–{t.to_kl ?? "∞"} kL @ ${(t.cents_per_kl / 100).toFixed(2)}/kL ·
                  {" "}{t.kl_in_tier.toFixed(0)} kL
                </span>
                <span><Money cents={t.amount_cents} /></span>
              </li>
            ))}
            <li style={{ display: "flex", justifyContent: "space-between",
                          marginTop: "0.375rem", paddingTop: "0.375rem",
                          borderTop: "1px solid var(--border)" }}>
              <span>Water charges</span>
              <span><Money cents={result.water_total_cents} /></span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sewerage (fixed)</span>
              <span><Money cents={result.sewerage_fixed_cents} /></span>
            </li>
            {result.sewerage_discharge_cents > 0 && (
              <li style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Sewerage (discharge {result.sewerage_discharge_kl.toFixed(1)} kL)</span>
                <span><Money cents={result.sewerage_discharge_cents} /></span>
              </li>
            )}
            <li style={{ display: "flex", justifyContent: "space-between",
                          marginTop: "0.5rem", paddingTop: "0.5rem",
                          borderTop: "1px solid var(--border)",
                          fontWeight: 700, fontSize: "1.0625rem" }}>
              <span>Total</span>
              <span><Money cents={result.grand_total_cents} /></span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
