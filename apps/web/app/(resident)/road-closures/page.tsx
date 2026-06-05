import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type RoadClosureRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const SEVERITY_COLOR: Record<string, string> = {
  planned: "#6b7280",
  works: "#C9A24B",
  closure: "#dc2626",
  emergency: "#991b1b",
};

function formatRange(starts: string, ends: string) {
  const s = new Date(starts);
  const e = new Date(ends);
  const sameDay = s.toDateString() === e.toDateString();
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  const t: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  if (sameDay) {
    return `${s.toLocaleDateString(undefined, opts)} · ${s.toLocaleTimeString(undefined, t)} – ${e.toLocaleTimeString(undefined, t)}`;
  }
  return `${s.toLocaleDateString(undefined, opts)} → ${e.toLocaleDateString(undefined, opts)}`;
}

export default async function RoadClosuresPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<RoadClosureRow[]>("/api/road-closures", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Road closures & works
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Active and upcoming road closures, planned works and event detours.
      </p>

      {rows.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No closures planned. Roads are clear.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: SEVERITY_COLOR[r.severity] ?? "#6b7280",
                  }} />
                  <span style={{
                    fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em",
                    color: "var(--text-secondary)", fontWeight: 600,
                  }}>{r.severity}</span>
                </div>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0.5rem 0 0.25rem" }}>{r.title}</h2>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {formatRange(r.starts_at, r.ends_at)}
                </p>
                {r.description && (
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem" }}>{r.description}</p>
                )}
                {r.detour && (
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                    <strong>Detour:</strong> {r.detour}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
