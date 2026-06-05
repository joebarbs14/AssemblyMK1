import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type AdminCategory, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";

export default async function AdminCategoriesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "admin") redirect("/account");

  const cats = await api<AdminCategory[]>("/api/admin/categories", { token });

  return (
    <AdminShell me={me} active="categories">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1rem" }}>Report categories</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Default categories are pre-seeded per council. Edit SLAs, deactivate, or add new ones to
        match how your teams work.
      </p>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", fontSize: "0.6875rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              <th style={cellHead}>Key</th>
              <th style={cellHead}>Label</th>
              <th style={cellHead}>SLA (h)</th>
              <th style={cellHead}>Photo</th>
              <th style={cellHead}>Active</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={cell}>{c.key}</td>
                <td style={cell}>{c.label}</td>
                <td style={{ ...cell, textAlign: "right" }} className="tnum">{c.sla_hours}</td>
                <td style={cell}>{c.requires_photo ? "Yes" : "No"}</td>
                <td style={cell}>{c.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p style={{ color: "var(--text-secondary)", margin: "1rem 0 0", fontSize: "0.8125rem" }}>
        Inline editing comes in M8.x. For now use psql or the API directly.
      </p>
    </AdminShell>
  );
}

const cellHead = { textAlign: "left" as const, padding: "0.625rem 0.875rem", fontWeight: 600 };
const cell = { padding: "0.625rem 0.875rem", fontSize: "0.875rem" };
