import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type CommunityPostRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { NewPostForm } from "./NewPostForm";

const KIND_LABEL: Record<string, string> = {
  event: "Event",
  lost_found: "Lost & found",
  garage_sale: "Garage sale",
  community: "Community",
};

export default async function NoticeboardPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const posts = await api<CommunityPostRow[]>("/api/noticeboard", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Community noticeboard
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Events, lost & found, garage sales. Posts go live after a quick moderation check.
      </p>

      <NewPostForm token={token} />

      <ul style={{ listStyle: "none", padding: 0, margin: "1.25rem 0 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {posts.length === 0 && (
          <li>
            <Card>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>Nothing posted yet — be the first.</p>
            </Card>
          </li>
        )}
        {posts.map((p) => (
          <li key={p.id}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{p.title}</p>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 8px",
                    borderRadius: "var(--r-full)",
                    background: "var(--gold-soft)",
                    color: "var(--gold-deep)",
                  }}
                >
                  {KIND_LABEL[p.kind] ?? p.kind}
                </span>
              </div>
              <p style={{ margin: "0.375rem 0 0.5rem", whiteSpace: "pre-wrap" }}>{p.body_markdown}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {p.author_name ?? "—"}
                {p.event_at &&
                  ` · ${new Date(p.event_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                {p.location_text && ` · ${p.location_text}`}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
