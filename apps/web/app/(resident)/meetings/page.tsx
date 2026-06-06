import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type MeetingRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function MeetingsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const meetings = await api<MeetingRow[]>("/api/meetings", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Council meetings
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Agendas, minutes, and outcomes. Livestream when available.
      </p>

      {meetings.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>No meetings on file.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {meetings.map((m) => (
            <li key={m.id}>
              <Card>
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
                  {new Date(m.starts_at).toLocaleDateString("en-AU", {
                    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <h2 style={{ margin: "0.25rem 0 0.25rem", fontSize: "1.0625rem", fontWeight: 600 }}>
                  {m.title}
                </h2>
                {m.location && (
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    {m.location}
                  </p>
                )}
                <div style={{ display: "flex", gap: 12, fontSize: "0.8125rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  {m.agenda_url && <a href={m.agenda_url}>Agenda PDF →</a>}
                  {m.minutes_url && <a href={m.minutes_url}>Minutes →</a>}
                  {m.livestream_url && <a href={m.livestream_url}>Watch live →</a>}
                </div>
                {m.items.length > 0 && (
                  <details style={{ marginTop: "0.875rem" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
                      Agenda ({m.items.length} items)
                    </summary>
                    <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", color: "var(--text-secondary)" }}>
                      {m.items.map((i) => (
                        <li key={i.id} style={{ marginBottom: "0.5rem" }}>
                          <strong style={{ color: "var(--text-primary)" }}>{i.title}</strong>
                          {i.description && <div style={{ fontSize: "0.8125rem" }}>{i.description}</div>}
                          {i.outcome && (
                            <div style={{ fontSize: "0.75rem", color: "var(--gold-deep)", marginTop: 2 }}>
                              Outcome: {i.outcome}
                              {i.votes_for != null && ` · ${i.votes_for} for / ${i.votes_against ?? 0} against`}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
