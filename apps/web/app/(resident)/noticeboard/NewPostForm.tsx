"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function NewPostForm({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"event" | "lost_found" | "garage_sale" | "community">("community");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/noticeboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          kind, title, body_markdown: body, location_text: location || null,
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't post");
      }
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <Card
        style={{
          background: "var(--success-soft)",
          border: "1px solid var(--success)",
          color: "var(--success)",
        }}
      >
        Thanks! Your post is in the queue. Council will review and publish shortly.
      </Card>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ New post</Button>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="kind" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Type</label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            style={{
              padding: "0.625rem 0.75rem", fontSize: "1rem", fontFamily: "inherit",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--r-md)", minHeight: 44,
            }}
          >
            <option value="community">Community</option>
            <option value="event">Event</option>
            <option value="lost_found">Lost &amp; found</option>
            <option value="garage_sale">Garage sale</option>
          </select>
        </div>
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="body" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Details</label>
          <textarea
            id="body"
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              padding: "0.625rem 0.75rem", fontSize: "0.9375rem", fontFamily: "inherit",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--r-md)", resize: "vertical",
            }}
          />
        </div>
        <Input label="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        {error && <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" disabled={pending}>{pending ? "Posting…" : "Submit post"}</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
