"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type RateCalcBreakdown, type RateCategoryRow } from "@/lib/api";

export function StrikePanel({ token, propertyId, category, calc, alreadyStruck }: {
  token: string;
  propertyId: number;
  category: RateCategoryRow;
  calc: RateCalcBreakdown;
  alreadyStruck: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadyStruck);
  const router = useRouter();

  async function strike() {
    if (!confirm(`Strike general rate of $${(calc.total_cents/100).toFixed(2)} for FY${category.fiscal_year}?`)) return;
    setBusy(true);
    try {
      await api(`/api/staff/rates/properties/${propertyId}/strike`, {
        method: "POST", token,
        body: { fiscal_year: category.fiscal_year, category_code: category.code },
      });
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{
      background: done ? "rgba(4,120,87,0.05)" : "var(--surface-muted)",
      borderLeft: `4px solid ${done ? "#047857" : "var(--brand)"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                       textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Suggested strike · {category.label} · FY{category.fiscal_year}
          </p>
          <p className="tnum" style={{ margin: "0.375rem 0 0", fontSize: "2rem", fontWeight: 700 }}>
            <Money cents={calc.total_cents} />
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            UV <Money cents={calc.land_value_cents} /> ·{" "}
            ad valorem <Money cents={calc.ad_valorem_component_cents} />
            {calc.minimum_applied && " · minimum applied"}
            {calc.concession_cents > 0 && (
              <> · concessions −<Money cents={calc.concession_cents} /></>
            )}
          </p>
        </div>
        <div>
          {done ? (
            <p style={{ margin: 0, color: "#047857", fontWeight: 700, fontSize: "0.875rem" }}>
              ✓ Struck
            </p>
          ) : (
            <Button onClick={strike} disabled={busy}>
              {busy ? "Striking…" : "Strike rate"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
