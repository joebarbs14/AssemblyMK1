import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type Me, type RatePropertyForStaff } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { StrikePanel } from "./StrikePanel";

interface PageProps { params: Promise<{ id: string }> }

export default async function StaffPropertyDetail({ params }: PageProps) {
  const { id } = await params;
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  let p: RatePropertyForStaff;
  try {
    p = await api<RatePropertyForStaff>(`/api/staff/rates/properties/${id}`, { token });
  } catch {
    notFound();
  }

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        {p.address}
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem", fontSize: "0.875rem" }}>
        {p.suburb} · {p.property_type} · {p.land_size_sqm?.toLocaleString() ?? "—"} m²
        {p.zone && ` · zone ${p.zone}`}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "0.7rem", fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: "var(--text-secondary)" }}>
            Account
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontFamily: "monospace", fontWeight: 600 }}>
            {p.account_number ?? "—"}
          </p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
            Balance: <strong><Money cents={p.balance_cents} /></strong>
            {p.next_due_date && (
              <span style={{ color: "var(--text-secondary)" }}>
                {" "}· next due {new Date(p.next_due_date).toLocaleDateString()}
              </span>
            )}
          </p>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0, fontSize: "0.7rem", fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: "var(--text-secondary)" }}>
            Latest valuation
          </h2>
          {p.valuations[0] ? (
            <>
              <p style={{ margin: "0.25rem 0 0", fontSize: "1.125rem", fontWeight: 600 }}>
                <Money cents={p.valuations[0].land_value_cents} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                  {" "}land value
                </span>
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Capital: <Money cents={p.valuations[0].capital_value_cents} /> · year {p.valuations[0].year}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>No valuations on file.</p>
          )}
        </Card>
      </div>

      {p.suggested_category && p.suggested_calc && (
        <StrikePanel token={token} propertyId={p.id}
          category={p.suggested_category}
          calc={p.suggested_calc}
          alreadyStruck={p.rate_charges.some((rc) =>
            rc.category === "general_rate"
            && new Date(rc.period_start).getFullYear() === p.suggested_category!.fiscal_year
          )} />
      )}

      <section style={{ marginTop: "1.25rem" }}>
        <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--text-secondary)",
                      margin: "0 0 0.5rem" }}>
          Rate charges
        </h2>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={head}>
                <th style={cell}>Period</th>
                <th style={cell}>Category</th>
                <th style={{ ...cell, textAlign: "right" }}>Amount</th>
                <th style={cell}>Note</th>
              </tr>
            </thead>
            <tbody>
              {p.rate_charges.map((rc, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cell}>
                    {new Date(rc.period_start).toLocaleDateString()} →{" "}
                    {new Date(rc.period_end).toLocaleDateString()}
                  </td>
                  <td style={cell}>{rc.category}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <Money cents={rc.amount_cents} />
                  </td>
                  <td style={{ ...cell, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {rc.note ?? ""}
                  </td>
                </tr>
              ))}
              {p.rate_charges.length === 0 && (
                <tr><td colSpan={4} style={{ ...cell, color: "var(--text-secondary)", textAlign: "center" }}>
                  No charges yet — strike the rate above.
                </td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {p.concessions.length > 0 && (
        <section style={{ marginTop: "1.25rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-secondary)",
                        margin: "0 0 0.5rem" }}>
            Concessions
          </h2>
          <Card>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {p.concessions.map((c, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", padding: "0.25rem 0" }}>
                  <span>{c.type} <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>({c.status})</span></span>
                  {c.annual_value_cents && <span>−<Money cents={c.annual_value_cents} />/yr</span>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {p.valuations.length > 1 && (
        <section style={{ marginTop: "1.25rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-secondary)",
                        margin: "0 0 0.5rem" }}>
            Valuation history
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={head}>
                  <th style={cell}>Year</th>
                  <th style={{ ...cell, textAlign: "right" }}>UV (land)</th>
                  <th style={{ ...cell, textAlign: "right" }}>CV (capital)</th>
                </tr>
              </thead>
              <tbody>
                {p.valuations.map((v) => (
                  <tr key={v.year} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={cell}>{v.year}</td>
                    <td style={{ ...cell, textAlign: "right" }}><Money cents={v.land_value_cents} /></td>
                    <td style={{ ...cell, textAlign: "right" }}><Money cents={v.capital_value_cents} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </StaffShell>
  );
}

const cell: React.CSSProperties = { padding: "0.5rem 0.625rem", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = {
  background: "var(--surface-muted)", textTransform: "uppercase",
  fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)",
};
