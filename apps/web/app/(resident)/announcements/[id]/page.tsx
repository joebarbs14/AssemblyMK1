import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type Announcement } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { id } = await params;

  let ann: Announcement;
  try {
    ann = await api<Announcement>(`/api/announcements/${id}`, { token });
  } catch {
    redirect("/announcements");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1.25rem 6rem" }}>
      <Link href="/announcements" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Community news
      </Link>

      <Card style={{ marginTop: "0.75rem", padding: "1.5rem 1.75rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--gold-deep)",
            fontWeight: 600,
          }}
        >
          {ann.publish_at
            ? new Date(ann.publish_at).toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
          {ann.author_name ? ` · ${ann.author_name}` : ""}
        </p>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 600, margin: "0.5rem 0 1.25rem" }}>
          {ann.title}
        </h1>
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: "1rem",
            lineHeight: 1.65,
            color: "var(--text-primary)",
          }}
        >
          {ann.body_markdown}
        </div>
      </Card>
    </main>
  );
}
