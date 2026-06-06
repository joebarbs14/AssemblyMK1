import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type SensorRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const KIND_LABEL: Record<string, string> = {
  air_pm25: "Air (PM2.5)",
  air_pm10: "Air (PM10)",
  noise_db: "Noise",
  water_ph: "Water pH",
  water_turbidity: "Water turbidity",
  temp_c: "Temperature",
};

function band(kind: string, value: number): { label: string; color: string } {
  if (kind === "air_pm25") {
    if (value < 12) return { label: "Good", color: "#047857" };
    if (value < 35) return { label: "Moderate", color: "#C9A24B" };
    return { label: "Unhealthy", color: "#dc2626" };
  }
  if (kind === "noise_db") {
    if (value < 55) return { label: "Quiet", color: "#047857" };
    if (value < 70) return { label: "Moderate", color: "#C9A24B" };
    return { label: "Loud", color: "#dc2626" };
  }
  return { label: "Reading", color: "var(--text-secondary)" };
}

export default async function SensorsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<SensorRow[]>("/api/sensors?hours=24", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Citizen sensors
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Live readings from community sensors — PurpleAir, Sensor.Community, OpenAQ and council nodes.
        Last 24 hours.
      </p>

      {rows.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No recent readings.</p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((s) => {
            const b = band(s.kind, s.value);
            return (
              <li key={s.id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{KIND_LABEL[s.kind] ?? s.kind}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {s.source} · {new Date(s.taken_at).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem" }}>
                        {s.value.toFixed(1)} <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{s.unit}</span>
                      </p>
                      <p style={{
                        margin: 0, fontSize: "0.7rem", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.04em", color: b.color,
                      }}>{b.label}</p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
