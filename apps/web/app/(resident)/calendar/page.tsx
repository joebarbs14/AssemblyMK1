import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { API_BASE } from "@/lib/env";
import { readSessionToken } from "@/lib/session";

export default async function CalendarPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  // Generate a token-bearing URL? For now, link the URL — but cookies
  // only work for the same origin. The user can also copy a curl command.
  const icsUrl = `${API_BASE}/api/calendar/me.ics`;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Calendar export
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Subscribe to your bin nights, booked programs and council meetings in Google, Apple,
        or Outlook calendar.
      </p>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Subscribe URL</h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
          Copy this and add as a calendar subscription. New events sync automatically.
        </p>
        <code style={{
          display: "block",
          padding: "0.625rem 0.75rem",
          background: "var(--surface-muted)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          fontSize: "0.8125rem",
          wordBreak: "break-all",
        }}>
          {icsUrl}
        </code>
        <details style={{ marginTop: "1rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>How to subscribe</summary>
          <ul style={{ marginTop: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            <li><strong>Google Calendar</strong>: Other calendars → From URL → paste above</li>
            <li><strong>Apple Calendar (macOS)</strong>: File → New Calendar Subscription → paste above</li>
            <li><strong>Outlook</strong>: Add calendar → Subscribe from web → paste above</li>
          </ul>
        </details>
        <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          RFC 5545 iCalendar. Generated server-side from the same data you see on your dashboard.
        </p>
      </Card>
    </main>
  );
}
