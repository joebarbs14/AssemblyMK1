import Link from "next/link";

import { Card } from "@/components/ui/Card";

export const metadata = { title: "Privacy — Assembly" };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: "0.75rem 0 0.5rem" }}>
        Privacy
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem" }}>
        Last updated: {new Date().getFullYear()}
      </p>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>What we collect</h2>
        <ul style={{ color: "var(--text-primary)", lineHeight: 1.65 }}>
          <li>Account: email, name, phone (optional), council association.</li>
          <li>Reports you file: description, photo, GPS or address, status updates.</li>
          <li>Rates: your property and account details (where you've linked them), invoice and payment history.</li>
          <li>Technical: IP address and user agent for security audit logging.</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>How we use it</h2>
        <ul style={{ lineHeight: 1.65 }}>
          <li>To route your reports to the right council team and notify you when they update.</li>
          <li>To show your rates balance and process payments you initiate.</li>
          <li>To send you council announcements you've opted in to.</li>
          <li>To detect abuse and maintain security audit trails.</li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          We never sell your data, and we never share it with anyone outside your council
          without your consent or a lawful direction.
        </p>
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Your rights (APP 12, APP 13)</h2>
        <ul style={{ lineHeight: 1.65 }}>
          <li>
            <strong>Access</strong>: download everything we hold about you any time via
            <a href="/account"> your account</a> → "Export my data".
          </li>
          <li>
            <strong>Correction</strong>: edit your name, phone, and notification preferences in your account.
          </li>
          <li>
            <strong>Deletion</strong>: request account deletion. Personal fields are wiped immediately;
            payment and audit records are retained 7 years per AU records law before hard purge.
          </li>
        </ul>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Breach notification (NDB scheme)</h2>
        <p>
          If we suffer a data breach likely to result in serious harm, we'll notify affected
          residents and the Office of the Australian Information Commissioner (OAIC) within
          30 days, per the Notifiable Data Breaches scheme.
        </p>
        <p style={{ marginBottom: 0 }}>
          Privacy questions or breach reports: <a href="mailto:privacy@assembly.local">privacy@assembly.local</a>
        </p>
      </Card>
    </main>
  );
}
