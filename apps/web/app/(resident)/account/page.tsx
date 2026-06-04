import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LogoutButton } from "./LogoutButton";

export default async function AccountPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let me: Me;
  try {
    me = await api<Me>("/api/auth/me", { token });
  } catch {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <p
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {me.council.name}
      </p>
      <h1 style={{ fontSize: "1.75rem", margin: "0.25rem 0 1.5rem", fontWeight: 600 }}>
        Hi {me.name ?? me.email}
      </h1>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Reports</h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
          Tell council about issues in your area, and follow them to resolution.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/reports/new">
            <Button>Report an issue</Button>
          </Link>
          <Link href="/reports">
            <Button variant="secondary">My reports</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Account</h2>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.5rem 1rem" }}>
          <dt style={{ color: "var(--text-secondary)" }}>Email</dt>
          <dd style={{ margin: 0 }}>{me.email}</dd>
          <dt style={{ color: "var(--text-secondary)" }}>Role</dt>
          <dd style={{ margin: 0 }}>{me.role}</dd>
          <dt style={{ color: "var(--text-secondary)" }}>Council</dt>
          <dd style={{ margin: 0 }}>{me.council.name}</dd>
        </dl>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
          <Button variant="secondary" disabled>
            Edit profile (M2.x)
          </Button>
          <LogoutButton />
        </div>
      </Card>
    </main>
  );
}
