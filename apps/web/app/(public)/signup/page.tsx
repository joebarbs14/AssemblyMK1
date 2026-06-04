"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 12;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Please use at least 12 characters.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "register", name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Sign-up failed");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.25rem", fontWeight: 600 }}>
        Create your account
      </h2>
      <p style={{ marginTop: 0, marginBottom: "1.25rem", color: "var(--text-secondary)" }}>
        Takes about 30 seconds. Your council uses this to send you updates on
        anything you report.
      </p>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <Input
          label="Full name"
          autoComplete="name"
          required
          placeholder="Alex Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          hint={tooShort ? undefined : "At least 12 characters."}
          errorText={tooShort ? `${12 - password.length} more characters needed.` : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={pending} fullWidth size="lg">
          {pending ? "Creating…" : "Create account"}
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
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          By creating an account, you agree to our terms and acknowledge the
          Privacy Policy. We never share your data outside your council.
        </p>
      </form>

      <p style={{ marginTop: "1.25rem", marginBottom: 0, fontSize: "0.875rem", textAlign: "center" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </Card>
  );
}
