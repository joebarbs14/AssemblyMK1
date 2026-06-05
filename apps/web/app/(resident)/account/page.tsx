import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LogoutButton } from "./LogoutButton";
import { NotificationsToggle } from "./NotificationsToggle";
import { PreferencesPanel } from "./PreferencesPanel";
import { VerifyIdentityPanel } from "./VerifyIdentityPanel";

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
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 1.25rem" }}>My account</h1>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Accessibility & language</h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
          Save your preferences to read, navigate and use the site comfortably.
        </p>
        <PreferencesPanel token={token} />
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Identity verification</h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
          Verified residents skip ID checks on permits, hardship claims and rates concessions.
        </p>
        <VerifyIdentityPanel token={token} />
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Notifications</h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
          Get a push when council replies on your reports.
        </p>
        <NotificationsToggle token={token} />
      </Card>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Profile</h2>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.5rem 1rem" }}>
          <dt style={{ color: "var(--text-secondary)" }}>Name</dt>
          <dd style={{ margin: 0 }}>{me.name ?? "—"}</dd>
          <dt style={{ color: "var(--text-secondary)" }}>Email</dt>
          <dd style={{ margin: 0 }}>{me.email}</dd>
          <dt style={{ color: "var(--text-secondary)" }}>Role</dt>
          <dd style={{ margin: 0, textTransform: "capitalize" }}>{me.role}</dd>
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
