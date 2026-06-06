"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function ProgramBookButton({
  programId,
  disabled,
}: {
  programId: number;
  disabled?: boolean;
}) {
  const [state, setState] = React.useState<"idle" | "pending" | "booked" | "error">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);

  async function book() {
    setState("pending");
    setMsg(null);
    try {
      const r = await fetch("/api/session/whoami");
      const { token } = (await r.json()) as { token: string | null };
      if (!token) throw new Error("not signed in");
      const res = await fetch(`${API_BASE}/api/programs/${programId}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't book");
      }
      const body = (await res.json()) as { already?: boolean };
      setState("booked");
      setMsg(body.already ? "You're already booked for this." : "Booked. We'll be in touch.");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  if (state === "booked") {
    return (
      <p style={{ margin: 0, color: "var(--success)", fontSize: "0.875rem" }}>
        ✓ {msg}
      </p>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Button onClick={book} disabled={disabled || state === "pending"} size="sm">
        {state === "pending" ? "Booking…" : "Sign up"}
      </Button>
      {msg && state === "error" && (
        <span style={{ color: "var(--danger)", fontSize: "0.8125rem" }}>{msg}</span>
      )}
    </div>
  );
}
