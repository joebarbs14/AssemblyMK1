import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type Announcement } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function AnnouncementsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let items: Announcement[] = [];
  try {
    items = await api<Announcement[]>("/api/announcements", { token });
  } catch {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 1rem" }}>
        Community news
      </h1>

      {items.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            No announcements right now. Check back later.
          </p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/announcements/${a.id}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <Card style={{ padding: "1rem 1.25rem" }}>
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
                    {a.publish_at ? new Date(a.publish_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                  </p>
                  <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, margin: "0.25rem 0" }}>
                    {a.title}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {a.body_markdown.slice(0, 200)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
