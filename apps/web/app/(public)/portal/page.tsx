"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch("/api/session/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.detail || "Sign-in failed");
        return;
      }
      router.replace("/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0f1922",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem 1.25rem",
        color: "#fff",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <p style={{
            margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "#C9A24B",
          }}>
            Staff portal
          </p>
          <h1 style={{ margin: "0.375rem 0 0", fontSize: "1.5rem", fontWeight: 600 }}>
            Council sign-in
          </h1>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", opacity: 0.7 }}>
            Staff and admin accounts only.
          </p>
        </div>

        <Card style={{ background: "#fff", color: "var(--text-primary)" }}>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending} fullWidth>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p style={{
            margin: "1rem 0 0", fontSize: "0.75rem", textAlign: "center",
            color: "var(--text-secondary)",
          }}>
            Resident?{" "}
            <a href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>
              Use the resident login →
            </a>
          </p>
        </Card>

        <p style={{
          margin: "1rem 0 0", fontSize: "0.7rem", letterSpacing: "0.04em",
          textAlign: "center", opacity: 0.55,
        }}>
          Unauthorised access is logged and monitored.
        </p>
      </div>
    </main>
  );
}
