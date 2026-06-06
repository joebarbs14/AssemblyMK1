import { redirect } from "next/navigation";

import { api, type Me, type WebhookRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { WebhooksManager } from "./WebhooksManager";

export default async function AdminWebhooksPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "admin") redirect("/account");
  const rows = await api<WebhookRow[]>("/api/admin/webhooks", { token });

  return (
    <AdminShell me={me} active="webhooks">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Webhooks</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Sync reports, rates and bookings to TechnologyOne, Authority, Pathway or any HTTP endpoint.
        Payloads are signed with HMAC SHA-256 — verify the <code>X-Assembly-Signature</code> header
        using the subscription secret.
      </p>
      <WebhooksManager token={token} initial={rows} />
    </AdminShell>
  );
}
