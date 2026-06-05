import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, type MyWasteRow, type WasteRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const TYPE_TONE: Record<string, { bg: string; fg: string }> = {
  general: { bg: "var(--surface-muted)", fg: "var(--text-secondary)" },
  recycling: { bg: "var(--info-soft)", fg: "var(--info)" },
  green: { bg: "var(--success-soft)", fg: "var(--success)" },
  hard: { bg: "var(--gold-soft)", fg: "var(--gold-deep)" },
};

export default async function WastePage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const [routes, mine] = await Promise.all([
    api<WasteRow[]>("/api/waste", { token }),
    api<MyWasteRow[]>("/api/waste/mine", { token }).catch(() => [] as MyWasteRow[]),
  ]);
  const myRoutes = mine.filter((m) => m.route !== null);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Waste & bins
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Council collection schedule. Address-matched routes ship in M12.x.
      </p>
      {myRoutes.length > 0 && (
        <Card
          style={{
            marginBottom: "1rem",
            background: "var(--brand)",
            color: "var(--brand-fg)",
            border: "none",
            padding: "1.25rem 1.5rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: 0.8,
              fontWeight: 600,
            }}
          >
            Your bin nights
          </p>
          {myRoutes.map((m) => (
            <div key={m.property_id} style={{ marginTop: "0.5rem" }}>
              <p style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700 }}>
                {m.route?.collection_day} —{" "}
                {m.route?.next_collection
                  ? new Date(m.route.next_collection).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })
                  : ""}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.875rem", opacity: 0.85 }}>
                {m.property_address} · {m.route?.collection_type} · {m.route?.frequency}
              </p>
            </div>
          ))}
        </Card>
      )}

      <Card
        style={{
          marginBottom: "1rem",
          background: "var(--gold-soft)",
          border: "1px solid var(--gold)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--gold-deep)" }}>
              Bin not emptied?
            </p>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Tell council and we'll get a crew out.
            </p>
          </div>
          <Link href="/reports/new">
            <Button variant="secondary" size="sm">
              Report it
            </Button>
          </Link>
        </div>
      </Card>

      {routes.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No schedules on file.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {routes.map((w) => {
            const tone = TYPE_TONE[w.collection_type] ?? TYPE_TONE.general;
            return (
              <li key={w.id}>
                <Card style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{w.name}</p>
                      <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {w.collection_day} · {w.frequency}
                        {w.next_collection
                          ? ` · next ${new Date(w.next_collection).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
                          : ""}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "2px 8px",
                        borderRadius: "var(--r-full)",
                        background: tone.bg,
                        color: tone.fg,
                      }}
                    >
                      {w.collection_type}
                    </span>
                  </div>
                  {w.notes && (
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {w.notes}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
