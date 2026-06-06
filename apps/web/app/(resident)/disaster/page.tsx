import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type DisasterAlertRow, type EvacCentreRow, type SandbagDepotRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const SEV_COLOR: Record<string, string> = {
  advice: "#C9A24B",
  watch: "#dc2626",
  emergency: "#991b1b",
};

const STATUS_COLOR: Record<string, string> = {
  open: "#047857",
  standby: "#6b7280",
  full: "#C9A24B",
  closed: "#dc2626",
};

export default async function DisasterPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const [alerts, evac, sandbags] = await Promise.all([
    api<DisasterAlertRow[]>("/api/disaster/alerts", { token }),
    api<EvacCentreRow[]>("/api/disaster/evac-centres", { token }),
    api<SandbagDepotRow[]>("/api/disaster/sandbags", { token }),
  ]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Disaster dashboard
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Live alerts, evacuation centres and sandbag depots. Sources: BoM, RFS, SES, council.
      </p>

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Active alerts</h2>
      {alerts.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No active alerts.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {alerts.map((a) => (
            <li key={a.id}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                    background: SEV_COLOR[a.severity] ?? "#6b7280", borderRadius: "var(--r-full)",
                  }}>{a.severity}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    {a.source.toUpperCase()} · {a.kind}
                  </span>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0.5rem 0 0.25rem" }}>{a.title}</h3>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>{a.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Evacuation centres</h2>
      {evac.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None listed.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {evac.map((e) => (
            <li key={e.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{e.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {e.address} · cap. {e.capacity ?? "—"}
                    </p>
                    {e.facilities && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {e.facilities.map((f) => f.replace("_", " ")).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span style={{
                    padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    color: "#fff", background: STATUS_COLOR[e.status] ?? "#6b7280",
                    borderRadius: "var(--r-full)", alignSelf: "flex-start",
                  }}>{e.status}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Sandbag depots</h2>
      {sandbags.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>None listed.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sandbags.map((s) => (
            <li key={s.id}>
              <Card>
                <p style={{ margin: 0, fontWeight: 600 }}>{s.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {s.address} · {s.hours ?? "see signage"}
                </p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
                  <strong>{s.bags_available}</strong> bags available
                  {s.self_serve && " · self-serve"}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
