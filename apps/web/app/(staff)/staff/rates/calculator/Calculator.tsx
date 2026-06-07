"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type RateCalcResult, type RateCategoryRow } from "@/lib/api";

const CONCESSIONS = [
  { code: "pensioner", label: "Pensioner (-$250/yr)" },
  { code: "hardship", label: "Hardship (-$150/yr)" },
];

export function Calculator({ token, categories }: {
  token: string;
  categories: RateCategoryRow[];
}) {
  const years = useMemo(
    () => Array.from(new Set(categories.map((c) => c.fiscal_year))).sort((a, b) => b - a),
    [categories],
  );
  const [fy, setFy] = useState(years[0] ?? new Date().getFullYear());
  const yearCats = useMemo(
    () => categories.filter((c) => c.fiscal_year === fy && c.is_active),
    [categories, fy],
  );
  const [code, setCode] = useState(yearCats[0]?.code ?? "");
  const [uv, setUv] = useState("400000");
  const [concessions, setConcessions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RateCalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!yearCats.find((c) => c.code === code) && yearCats[0]) {
      setCode(yearCats[0].code);
    }
  }, [yearCats, code]);

  async function compute() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<RateCalcResult>("/api/staff/rates/calculate", {
        method: "POST", token,
        body: {
          fiscal_year: fy, category_code: code,
          land_value_cents: Math.round(Number(uv) * 100),
          apply_concessions: concessions,
        },
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  if (categories.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0 }}>
          No rate categories defined yet. Go to <a href="/staff/rates/categories">Categories</a> first.
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Inputs</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.875rem" }}>
            Fiscal year
            <select value={fy} onChange={(e) => setFy(Number(e.target.value))} style={sel}>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
          <label style={{ fontSize: "0.875rem" }}>
            Category
            <select value={code} onChange={(e) => setCode(e.target.value)} style={sel}>
              {yearCats.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </label>
          <label style={{ fontSize: "0.875rem" }}>
            Unimproved (land) value: $<input value={uv} onChange={(e) => setUv(e.target.value)}
              type="number" min={0} step={1000}
              style={{ width: 140, marginLeft: "0.375rem", padding: "0.25rem 0.5rem",
                       border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                       fontFamily: "inherit" }} />
            <input type="range" min={50000} max={5000000} step={10000}
              value={uv} onChange={(e) => setUv(e.target.value)}
              style={{ width: "100%", marginTop: "0.5rem" }} />
          </label>
          <div>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>Concessions</p>
            {CONCESSIONS.map((c) => (
              <label key={c.code} style={{ display: "block", fontSize: "0.8125rem" }}>
                <input type="checkbox" checked={concessions.includes(c.code)}
                  onChange={(e) => setConcessions((prev) =>
                    e.target.checked ? [...prev, c.code] : prev.filter((x) => x !== c.code)
                  )} /> {c.label}
              </label>
            ))}
          </div>
          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
          <Button onClick={compute} disabled={busy || !code}>{busy ? "Calculating…" : "Calculate"}</Button>
        </div>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Breakdown</h2>
        {!result && <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Hit calculate to see the breakdown.
        </p>}
        {result && (
          <>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <strong>{result.category.label}</strong> · FY{result.category.fiscal_year}
            </p>
            <dl style={{ marginTop: "0.75rem", display: "grid",
                          gridTemplateColumns: "max-content 1fr", gap: "0.375rem 1rem",
                          fontSize: "0.875rem" }}>
              <dt>UV</dt>
              <dd className="tnum" style={{ margin: 0, textAlign: "right" }}>
                <Money cents={result.breakdown.land_value_cents} />
              </dd>
              <dt>× ad valorem ({result.breakdown.ad_valorem_cents_per_dollar.toFixed(6)})</dt>
              <dd className="tnum" style={{ margin: 0, textAlign: "right" }}>
                <Money cents={result.breakdown.ad_valorem_component_cents} />
              </dd>
              <dt>+ base</dt>
              <dd className="tnum" style={{ margin: 0, textAlign: "right" }}>
                <Money cents={result.breakdown.base_amount_cents} />
              </dd>
              <dt style={{ fontWeight: 600 }}>Gross</dt>
              <dd className="tnum" style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>
                <Money cents={result.breakdown.gross_cents} />
              </dd>
              {result.breakdown.minimum_applied && (
                <>
                  <dt style={{ color: "#C9A24B" }}>Minimum applied</dt>
                  <dd className="tnum" style={{ margin: 0, textAlign: "right", color: "#C9A24B" }}>
                    <Money cents={result.breakdown.minimum_cents} />
                  </dd>
                </>
              )}
              {result.breakdown.concession_cents > 0 && (
                <>
                  <dt>− concessions</dt>
                  <dd className="tnum" style={{ margin: 0, textAlign: "right" }}>
                    −<Money cents={result.breakdown.concession_cents} />
                  </dd>
                </>
              )}
            </dl>
            <div style={{ marginTop: "0.75rem", padding: "0.75rem",
                          background: "var(--surface-muted)", borderRadius: "var(--r-md)",
                          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.06em",
                          textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 700 }}>
                Annual rate
              </p>
              <p className="tnum" style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                <Money cents={result.breakdown.total_cents} />
              </p>
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Quarterly instalment: <Money cents={Math.round(result.breakdown.total_cents / 4)} />
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

const sel: React.CSSProperties = {
  marginTop: "0.25rem", width: "100%", padding: "0.5rem",
  borderRadius: "var(--r-md)", border: "1px solid var(--border)",
  background: "var(--surface)", fontFamily: "inherit",
};
