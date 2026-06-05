"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { AdminUser } from "@/lib/api";

export function UsersTable({ initial, token }: { initial: AdminUser[]; token: string }) {
  const [users, setUsers] = React.useState<AdminUser[]>(initial);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<"staff" | "admin">("staff");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
    };
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email, name, role }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't invite");
      }
      const u = (await r.json()) as AdminUser;
      setUsers([u, ...users]);
      setEmail("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't invite");
    } finally {
      setPending(false);
    }
  }

  async function patch(id: number, body: Partial<Pick<AdminUser, "role" | "status">>) {
    const r = await fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const u = (await r.json()) as AdminUser;
      setUsers(users.map((x) => (x.id === u.id ? u : x)));
    }
  }

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.0625rem", fontWeight: 600 }}>Invite staff</h2>
        <form onSubmit={invite} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px auto", gap: 8, alignItems: "end" }}>
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label htmlFor="role" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "staff" | "admin")}
              style={{
                padding: "0.625rem 0.75rem", fontSize: "1rem", fontFamily: "inherit",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-md)", minHeight: 44,
              }}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>Invite</Button>
        </form>
        {error && (
          <p role="alert" style={{ margin: "0.5rem 0 0", color: "var(--danger)", fontSize: "0.875rem" }}>{error}</p>
        )}
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", fontSize: "0.6875rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              <Th>Email</Th><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>{u.email}</Td>
                <Td>{u.name ?? "—"}</Td>
                <Td>{u.role}</Td>
                <Td>{u.status}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 4 }}>
                    {u.status === "active" && u.role !== "admin" && (
                      <Button size="sm" variant="ghost" onClick={() => patch(u.id, { status: "disabled" })}>Disable</Button>
                    )}
                    {u.status === "disabled" && (
                      <Button size="sm" variant="ghost" onClick={() => patch(u.id, { status: "active" })}>Re-enable</Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "0.625rem 0.875rem", fontWeight: 600 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.875rem" }}>{children}</td>;
}
