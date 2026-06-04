import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type BpayOut, type InvoiceOut, type PropertyDetail } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function RatesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const { id } = await params;
  const propId = Number(id);
  if (!Number.isFinite(propId)) redirect("/rates");

  let property: PropertyDetail;
  let invoices: InvoiceOut[] = [];
  let bpay: BpayOut | null = null;
  try {
    [property, invoices] = await Promise.all([
      api<PropertyDetail>(`/api/rates/properties/${propId}`, { token }),
      api<InvoiceOut[]>(`/api/rates/properties/${propId}/invoices`, { token }),
    ]);
    if (property.account) {
      try {
        bpay = await api<BpayOut>(`/api/rates/properties/${propId}/bpay`, { token });
      } catch {
        bpay = null;
      }
    }
  } catch {
    redirect("/rates");
  }

  const today = new Date();
  const due = property.account?.next_due_date ? new Date(property.account.next_due_date) : null;
  const daysToDue = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null;
  const overdue = daysToDue !== null && daysToDue < 0;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1.25rem 6rem" }}>
      <Link href="/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Properties
      </Link>

      <header style={{ margin: "0.75rem 0 1rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {property.property_type} property
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.25rem 0 0.25rem" }}>{property.address}</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          {[property.suburb, property.postcode].filter(Boolean).join(" ")}
          {property.zone ? ` · Zone ${property.zone}` : ""}
          {property.land_size_sqm ? ` · ${property.land_size_sqm} m²` : ""}
        </p>
      </header>

      {property.account && (
        <Card style={{ marginBottom: "1rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}
          >
            Account {property.account.account_number}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "0.5rem" }}>
            <Money cents={property.account.balance_cents} emphasis />
            {due && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8125rem",
                  color: overdue ? "var(--danger)" : "var(--text-secondary)",
                }}
              >
                {overdue
                  ? `Overdue by ${-daysToDue!} days`
                  : `Due ${due.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
            <Link href={`/rates/${property.id}/pay`}>
              <Button>Pay rates</Button>
            </Link>
            <Link href={`/rates/${property.id}/invoices`}>
              <Button variant="secondary">Invoices</Button>
            </Link>
          </div>
        </Card>
      )}

      {bpay && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>BPAY</h2>
          <p style={{ margin: "0 0 0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Pay from your bank app — these details are unique to this property.
          </p>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "0.25rem 1rem",
              fontSize: "0.9375rem",
            }}
          >
            <dt style={{ color: "var(--text-secondary)" }}>Biller code</dt>
            <dd style={{ margin: 0, fontWeight: 600 }} className="tnum">
              {bpay.biller_code}
            </dd>
            <dt style={{ color: "var(--text-secondary)" }}>Reference (CRN)</dt>
            <dd style={{ margin: 0, fontWeight: 600 }} className="tnum">
              {bpay.crn}
            </dd>
          </dl>
          <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>
            <a href={bpay.deep_link}>Open in your banking app</a>
          </p>
        </Card>
      )}

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Recent invoices</h2>
        {invoices.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>No invoices on file.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {invoices.slice(0, 5).map((inv, i) => (
              <li
                key={inv.id}
                style={{
                  padding: "0.625rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{inv.invoice_number}</p>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Issued {new Date(inv.issue_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}{" "}
                    · {inv.status}
                  </p>
                </div>
                <Money cents={inv.amount_cents} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Valuations</h2>
        {property.valuations.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>No valuations on file.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                <th style={{ textAlign: "left", padding: "0.25rem 0" }}>Year</th>
                <th style={{ textAlign: "right", padding: "0.25rem 0" }}>Land</th>
                <th style={{ textAlign: "right", padding: "0.25rem 0" }}>Capital</th>
              </tr>
            </thead>
            <tbody>
              {property.valuations.map((v) => (
                <tr key={v.year} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.375rem 0" }} className="tnum">
                    {v.year}
                  </td>
                  <td style={{ padding: "0.375rem 0", textAlign: "right" }}>
                    <Money cents={v.land_value_cents} />
                  </td>
                  <td style={{ padding: "0.375rem 0", textAlign: "right" }}>
                    <Money cents={v.capital_value_cents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {property.rate_charges.length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Charge breakdown</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {property.rate_charges.map((c, i) => (
              <li
                key={i}
                style={{
                  padding: "0.5rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ textTransform: "capitalize" }}>{c.category.replace("_", " ")}</span>
                <Money cents={c.amount_cents} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(property.waste_entitlement || property.overlays.length > 0 || property.concessions.length > 0) && (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Property details</h2>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "0.375rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            {property.waste_entitlement && (
              <>
                <dt style={{ color: "var(--text-secondary)" }}>Bin</dt>
                <dd style={{ margin: 0 }}>
                  {property.waste_entitlement.bin_size_l} L on {property.waste_entitlement.collection_day ?? "—"}
                </dd>
              </>
            )}
            {property.overlays.map((o, i) => (
              <Row key={`o-${i}`} label={`${o.kind} overlay`} value={o.note ?? o.source ?? "—"} />
            ))}
            {property.concessions.map((c, i) => (
              <Row
                key={`c-${i}`}
                label={`${c.type} concession`}
                value={
                  c.status === "active" && c.annual_value_cents
                    ? `Active · saves $${(c.annual_value_cents / 100).toFixed(2)}/yr`
                    : c.link_apply
                      ? "Not active — apply via council"
                      : c.status
                }
              />
            ))}
          </dl>
        </Card>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </>
  );
}
