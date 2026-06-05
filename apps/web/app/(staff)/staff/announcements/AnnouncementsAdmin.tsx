"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { Announcement } from "@/lib/api";

export function AnnouncementsAdmin({
  initialItems,
  token,
}: {
  initialItems: Announcement[];
  token: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<Announcement[]>(initialItems);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
    };
  }

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/staff/announcements`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title,
          body_markdown: body,
          audience: "council",
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't save");
      }
      const created = (await r.json()) as Announcement;
      setItems([created, ...items]);
      setTitle("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setPending(false);
    }
  }

  async function publish(id: number) {
    const r = await fetch(`${API_BASE}/api/staff/announcements/${id}/publish`, {
      method: "POST",
      headers: headers(),
    });
    if (r.ok) {
      const updated = (await r.json()) as Announcement;
      setItems(items.map((a) => (a.id === id ? updated : a)));
    }
  }

  async function archive(id: number) {
    const r = await fetch(`${API_BASE}/api/staff/announcements/${id}/archive`, {
      method: "POST",
      headers: headers(),
    });
    if (r.ok) {
      const updated = (await r.json()) as Announcement;
      setItems(items.map((a) => (a.id === id ? updated : a)));
    }
  }

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.0625rem", fontWeight: 600 }}>New announcement</h2>
        <form onSubmit={createAnnouncement} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label htmlFor="body" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Body (plain text or basic markdown)
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              style={{
                padding: "0.625rem 0.75rem",
                fontSize: "0.9375rem",
                fontFamily: "inherit",
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
          <Button type="submit" disabled={pending || title.length < 3 || body.length < 1}>
            {pending ? "Saving…" : "Save as draft"}
          </Button>
          {error && (
            <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>
              {error}
            </p>
          )}
        </form>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1.0625rem", fontWeight: 600 }}>All announcements</h2>
        {items.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>None yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((a, i) => (
              <li
                key={a.id}
                style={{
                  padding: "0.75rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{a.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {a.status}
                      {a.publish_at ? ` · ${new Date(a.publish_at).toLocaleDateString("en-AU")}` : ""}
                    </p>
                  </div>
                  {a.status === "draft" && (
                    <Button size="sm" onClick={() => publish(a.id)}>
                      Publish
                    </Button>
                  )}
                  {a.status === "published" && (
                    <Button size="sm" variant="ghost" onClick={() => archive(a.id)}>
                      Archive
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
