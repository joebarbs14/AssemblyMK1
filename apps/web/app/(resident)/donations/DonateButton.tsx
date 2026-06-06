"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

const AMOUNTS = [5, 20, 50, 100];

export function DonateButton({ campaignId }: { campaignId: number }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function donate(aud: number) {
    setPending(true);
    try {
      const wr = await fetch("/api/session/whoami");
      const { token } = (await wr.json()) as { token: string | null };
      if (!token) return;
      await fetch(`${API_BASE}/api/donations/campaigns/${campaignId}/donate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({ amount_cents: aud * 100, anonymous: false }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {AMOUNTS.map((a) => (
        <Button key={a} size="sm" onClick={() => donate(a)} disabled={pending}>
          ${a}
        </Button>
      ))}
      <p style={{ margin: "0 0 0 4px", alignSelf: "center", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
        PayPal flow (mock until wired)
      </p>
    </div>
  );
}
