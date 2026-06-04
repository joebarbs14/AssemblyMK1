"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

type Mode = "message" | "status" | "file_request";

const STATUSES = [
  "triaging",
  "in_progress",
  "awaiting_resident",
  "resolved",
  "closed",
  "duplicate",
  "rejected",
] as const;

export function StaffComposer({ reportId, token }: { reportId: number; token: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("message");
  const [body, setBody] = React.useState("");
  const [internal, setInternal] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<string>("in_progress");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { kind: mode === "status" ? "status_change" : mode };
      if (mode === "message") {
        if (!body.trim()) return;
        payload.body = body.trim();
        payload.internal = internal;
      } else if (mode === "status") {
        payload.metadata = { to: newStatus };
        if (body.trim()) payload.body = body.trim();
      } else if (mode === "file_request") {
        if (!body.trim()) {
          setError("Tell the resident what you need.");
          return;
        }
        payload.body = body.trim();
      }

      const res = await fetch(`${API_BASE}/api/staff/reports/${reportId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify(payload),
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
        marginTop: "1rem",
        background: "var(--surface-muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "0.75rem",
      }}
    >
      <div role="tablist" aria-label="Composer mode" style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {(["message", "status", "file_request"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            style={{
              padding: "0.25rem 0.625rem",
              fontSize: "0.8125rem",
              border: "none",
              borderRadius: "var(--r-full)",
              background: mode === m ? "var(--brand)" : "transparent",
              color: mode === m ? "var(--brand-fg)" : "var(--text-primary)",
              cursor: "pointer",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            {m === "message" ? "Reply" : m === "status" ? "Change status" : "Request file"}
          </button>
        ))}
      </div>

      {mode === "status" && (
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.625rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            fontSize: "0.9375rem",
            fontFamily: "inherit",
            marginBottom: 8,
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={mode === "file_request" ? 2 : 2}
        placeholder={
          mode === "message"
            ? internal ? "Internal note (resident won't see)" : "Reply to resident…"
            : mode === "status"
              ? "Optional comment for the resident"
              : "What photo or document do you need?"
        }
        style={{
          width: "100%",
          padding: "0.5rem 0.625rem",
          fontSize: "0.9375rem",
          fontFamily: "inherit",
          background: "var(--surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          outline: "none",
          resize: "vertical",
          marginBottom: 8,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {mode === "message" && (
          <label style={{ fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Internal note
          </label>
        )}
        {error && (
          <p role="alert" style={{ color: "var(--danger)", margin: 0, fontSize: "0.8125rem" }}>
            {error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={pending} style={{ marginLeft: "auto" }}>
          {pending ? "…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
