"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function SeedDemoButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function seed() {
    setPending(true);
    try {
      // Cookie auth via Next session — call the API directly with the cookie.
      const tokenRes = await fetch("/api/session/whoami");
      const { token } = await tokenRes.json();
      if (!token) throw new Error("not signed in");
      const r = await fetch(`${API_BASE}/api/rates/demo-seed`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
      });
      if (!r.ok) throw new Error("seed failed");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={seed} disabled={pending}>
      {pending ? "Loading…" : "Load demo property"}
    </Button>
  );
}
