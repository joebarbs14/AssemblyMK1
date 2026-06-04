"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

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
        router.push("/account");
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
          throw new Error("Couldn't send the link. Try again.");
        }
        setInfo("If that email is registered, we've sent a sign-in link. Check your inbox.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.25rem" }}>Sign in</h2>
      <p style={{ marginTop: 0, marginBottom: "1.25rem", color: "var(--text-secondary)" }}>
        Welcome back.
      </p>

      <div
        role="tablist"
        aria-label="Sign-in method"
        style={{
          display: "inline-flex",
          background: "var(--surface-muted)",
          borderRadius: "var(--r-full)",
          padding: 4,
          gap: 4,
          marginBottom: "1rem",
        }}
      >
        {(["magic", "password"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              minHeight: 32,
              padding: "0.25rem 0.875rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              borderRadius: "var(--r-full)",
              background: mode === m ? "var(--surface)" : "transparent",
              color: "var(--text-primary)",
              boxShadow: mode === m ? "var(--e1)" : "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {m === "magic" ? "Email link" : "Password"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? "Working…" : mode === "magic" ? "Send sign-in link" : "Sign in"}
        </Button>
        {error && (
          <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}
        {info && (
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>{info}</p>
        )}
      </form>

      <p style={{ marginTop: "1.25rem", marginBottom: 0, fontSize: "0.875rem" }}>
        New here? <a href="/signup">Create an account</a>
      </p>
    </Card>
  );
}
