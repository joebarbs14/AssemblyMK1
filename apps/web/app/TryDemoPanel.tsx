"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function TryDemoPanel() {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | "rates" | "report">(null);
  const [error, setError] = React.useState<string | null>(null);

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const r = await fetch("/api/session/whoami");
    const { token } = (await r.json()) as { token: string | null };
    if (!token) throw new Error("not signed in");
    return fn(token);
  }

  async function seedRates() {
    setPending("rates");
    setError(null);
    try {
      await withToken(async (token) => {
        const r = await fetch(`${API_BASE}/api/rates/demo-seed`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
          },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      });
      router.push("/rates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card
      style={{
        marginBottom: "1rem",
        background: "var(--surface-muted)",
        borderStyle: "dashed",
      }}
    >
      <p
        style={{
          fontSize: "0.6875rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          margin: 0,
          fontWeight: 600,
        }}
      >
        Try the demo
      </p>
      <h2 style={{ marginTop: "0.25rem", marginBottom: "0.5rem", fontSize: "1.0625rem", fontWeight: 600 }}>
        Populate sample data
      </h2>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
        Load a fully-modelled rates property with invoices, valuations, and BPAY details so
        the rates view has something to show.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button onClick={seedRates} disabled={pending !== null} size="sm">
          {pending === "rates" ? "Loading…" : "Load demo property"}
        </Button>
      </div>
      {error && (
        <p role="alert" style={{ margin: "0.75rem 0 0", color: "var(--danger)", fontSize: "0.8125rem" }}>
          {error}
        </p>
      )}
    </Card>
  );
}
