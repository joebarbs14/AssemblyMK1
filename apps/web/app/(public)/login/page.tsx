"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { AssemblyLogo } from "@/components/AssemblyLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DEFAULT_COUNCIL_SLUG } from "@/lib/env";

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("magic");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      if (mode === "password") {
        const res = await fetch("/api/session/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "password", email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail ?? "Sign in failed");
        }
        router.push("/");
        router.refresh();
      } else {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/auth/magic-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
          },
          body: JSON.stringify({ email }),
        });
        if (!res.ok && res.status !== 202) {
          throw new Error("We couldn't send a link right now. Please try again.");
        }
        setInfo(
          `If ${email} is registered, we've sent a sign-in link. Check your inbox — it expires in 15 minutes.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
        <AssemblyLogo variant="stacked" size={56} theme="light" />
      </div>
      <h2 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.25rem",
                    fontWeight: 600, textAlign: "center" }}>
        Sign in
      </h2>
      <p style={{ marginTop: 0, marginBottom: "1.25rem", color: "var(--text-secondary)",
                   textAlign: "center" }}>
        Use the email registered with your council.
      </p>

      <div
        role="tablist"
        aria-label="Sign-in method"
        style={{
          display: "flex",
          background: "var(--surface-muted)",
          borderRadius: "var(--r-full)",
          padding: 4,
          gap: 4,
          marginBottom: "1.25rem",
        }}
      >
        {(
          [
            { id: "magic", label: "Email link" },
            { id: "password", label: "Password" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setError(null);
              setInfo(null);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              padding: "0.25rem 0.875rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              borderRadius: "var(--r-full)",
              background: mode === m.id ? "var(--surface)" : "transparent",
              color: mode === m.id ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: mode === m.id ? "var(--e1)" : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background var(--d-std) var(--ease-in)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={mode === "magic" ? "We'll send a one-time sign-in link." : undefined}
        />
        {mode === "password" && (
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <Button type="submit" disabled={pending} fullWidth size="lg">
          {pending
            ? "Working…"
            : mode === "magic"
              ? "Send sign-in link"
              : "Sign in"}
        </Button>
        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: "0.625rem 0.75rem",
              background: "#fef3f2",
              border: "1px solid #fecdca",
              borderRadius: "var(--r-md)",
              color: "var(--danger)",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </p>
        )}
        {info && (
          <p
            role="status"
            style={{
              margin: 0,
              padding: "0.625rem 0.75rem",
              background: "#ecfdf3",
              border: "1px solid #abefc6",
              borderRadius: "var(--r-md)",
              color: "#067647",
              fontSize: "0.875rem",
            }}
          >
            {info}
          </p>
        )}
      </form>

      <div
        style={{
          margin: "1.5rem 0 0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "var(--text-secondary)",
          fontSize: "0.75rem",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} aria-hidden="true" />
        <span>Council staff</span>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} aria-hidden="true" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Microsoft Entra SSO arrives in M2.x"
          style={ssoButton}
        >
          <span aria-hidden="true" style={{ ...ssoMark, background: "#f25022" }} />
          Continue with Microsoft
          <span style={ssoBadge}>Soon</span>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Google Workspace SSO arrives in M2.x"
          style={ssoButton}
        >
          <span aria-hidden="true" style={{ ...ssoMark, background: "#ea4335" }} />
          Continue with Google
          <span style={ssoBadge}>Soon</span>
        </button>
      </div>

      <p style={{ marginTop: "1.25rem", marginBottom: 0, fontSize: "0.875rem", textAlign: "center" }}>
        New here? <a href="/signup">Create an account</a>
      </p>
      <p style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: "0.75rem",
                   textAlign: "center", color: "var(--text-secondary)" }}>
        Council staff?{" "}
        <a href="/portal" style={{ fontWeight: 600 }}>Sign in to the staff portal →</a>
      </p>
    </Card>
  );
}

const ssoButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minHeight: 44,
  padding: "0.5rem 0.875rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  color: "var(--text-primary)",
  fontSize: "0.9375rem",
  fontWeight: 500,
  cursor: "not-allowed",
  opacity: 0.7,
  fontFamily: "inherit",
};

const ssoMark: React.CSSProperties = {
  display: "inline-block",
  width: 16,
  height: 16,
  borderRadius: 3,
};

const ssoBadge: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "0.625rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  background: "var(--surface-muted)",
  padding: "2px 6px",
  borderRadius: "var(--r-full)",
};
