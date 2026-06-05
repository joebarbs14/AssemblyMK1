import Link from "next/link";

import { Card } from "@/components/ui/Card";

export const metadata = { title: "Terms — Assembly" };

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: "0.75rem 0 0.5rem" }}>Terms of use</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem" }}>
        Last updated: {new Date().getFullYear()}
      </p>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Using Assembly</h2>
        <p>
          Assembly is provided by your council to give residents a single place to report
          issues, pay rates, and stay informed. Be honest in what you report; abuse of the
          service may result in your account being disabled.
        </p>
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Reports and photos</h2>
        <p>
          By submitting a report you grant council a licence to use the content for the
          purposes of investigating and resolving the issue. Don't include identifying
          information about other people unless it's necessary.
        </p>
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Payments</h2>
        <p>
          Rates payments are processed by PayPal (cards and wallet) or your bank (BPAY).
          Assembly never sees your card details. Refunds and chargebacks are handled per
          the relevant provider's terms.
        </p>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Availability</h2>
        <p>
          We aim for high availability but service is provided "as is" without warranty.
          Council remains the source of truth for rates accounts; if something looks wrong
          here, please tell us via your report timeline so we can fix it.
        </p>
      </Card>
    </main>
  );
}
