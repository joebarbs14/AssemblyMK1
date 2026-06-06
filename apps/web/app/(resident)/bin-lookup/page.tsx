"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { BinLookupResult } from "@/lib/api";

export default function BinLookupPage() {
  const [address, setAddress] = React.useState("");
  const [result, setResult] = React.useState<BinLookupResult | null>(null);
  const [pending, setPending] = React.useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const r = await fetch("/api/session/whoami");
      const { token } = (await r.json()) as { token: string | null };
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const res = await fetch(
        `${API_BASE}/api/bin-lookup?address=${encodeURIComponent(address)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
          },
        },
      );
      if (res.ok) setResult((await res.json()) as BinLookupResult);
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Bin lookup
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Type your address and we'll tell you exactly which bin to put out.
      </p>

      <Card style={{ marginBottom: "1rem" }}>
        <form onSubmit={lookup} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 12 Sample Street"
              required
            />
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Looking…" : "Find"}</Button>
        </form>
      </Card>

      {result && (
        result.matched_address ? (
          <Card
            style={{
              background: "var(--brand)",
              color: "var(--brand-fg)",
              border: "none",
              padding: "1.5rem 1.75rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.85, fontWeight: 600 }}>
              {result.matched_address}
            </p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
              {result.collection_day ?? "No route"}
              {result.next_collection && ` — ${new Date(result.next_collection).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
            </p>
            <p style={{ margin: "0.25rem 0 0", opacity: 0.85 }}>
              {result.route_name} · {result.frequency}
            </p>
            {result.bin_colours_tomorrow.length > 0 && (
              <div style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
                {result.bin_colours_tomorrow.map((c) => (
                  <span key={c} style={{
                    padding: "0.5rem 0.875rem",
                    background: "#FBFBF9",
                    color: "var(--brand)",
                    borderRadius: "var(--r-full)",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}>
                    {c} bin tomorrow
                  </span>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Couldn't match that address. Try a simpler version or check your linked properties under
              {" "}<Link href="/rates">Rates</Link>.
            </p>
          </Card>
        )
      )}
    </main>
  );
}
