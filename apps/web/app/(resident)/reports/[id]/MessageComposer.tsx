"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function MessageComposer({ reportId, token }: { reportId: number; token: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({ kind: "message", body: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail ?? "Couldn't send");
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={send}
      style={{
        position: "sticky",
        bottom: 0,
        marginTop: "1rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "0.75rem",
        boxShadow: "var(--e1)",
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      <textarea
        aria-label="Write a message to council"
        placeholder="Reply to council…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={1}
        style={{
          flex: 1,
          padding: "0.5rem 0.625rem",
          fontSize: "1rem",
          fontFamily: "inherit",
          background: "var(--surface-muted)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          outline: "none",
          resize: "none",
          minHeight: 40,
          maxHeight: 160,
        }}
      />
      <Button type="submit" disabled={pending || body.trim().length === 0} size="sm">
        {pending ? "…" : "Send"}
      </Button>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "0.8125rem" }}>
          {error}
        </p>
      )}
    </form>
  );
}
