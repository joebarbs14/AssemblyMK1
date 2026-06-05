import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type AuditEntry, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";

export default async function AdminAuditPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "admin") redirect("/account");

  const entries = await api<AuditEntry[]>("/api/admin/audit", { token });

  return (
    <AdminShell me={me} active="audit">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1rem" }}>Audit log</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Append-only record of state-changing API calls. Retained 7 years per AU records policy.
      </p>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {entries.length === 0 ? (
          <p style={{ padding: "2rem", color: "var(--text-secondary)", margin: 0 }}>No entries yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", fontSize: "0.6875rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                <th style={cellHead}>When</th>
                <th style={cellHead}>Actor</th>
                <th style={cellHead}>Action</th>
                <th style={cellHead}>Target</th>
                <th style={cellHead}>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cell} className="tnum">
                    {new Date(e.created_at).toLocaleString("en-AU", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td style={cell}>{e.actor_name ?? `#${e.actor_user_id ?? "system"}`}</td>
                  <td style={cell}><code>{e.action}</code></td>
                  <td style={cell}>{e.target_type ? `${e.target_type}#${e.target_id}` : "—"}</td>
                  <td style={cell} className="tnum">{e.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AdminShell>
  );
}

const cellHead = { textAlign: "left" as const, padding: "0.625rem 0.875rem", fontWeight: 600 };
const cell = { padding: "0.625rem 0.875rem", fontSize: "0.8125rem" };
