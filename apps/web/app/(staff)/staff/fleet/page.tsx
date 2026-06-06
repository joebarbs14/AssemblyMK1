import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type FleetVehicleRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function FleetPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<FleetVehicleRow[]>("/api/fleet/vehicles", { token });

  const totalCo2 = rows.reduce((s, v) => s + v.co2_kg_per_km * v.odometer_km, 0);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/staff" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Staff console</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Fleet & plant
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Vehicles, scheduled service, fuel mix, lifecycle emissions.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Vehicles</p><p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{rows.length}</p></Card>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Overdue service</p><p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: rows.some((r) => r.service_overdue) ? "var(--danger)" : undefined }}>{rows.filter((r) => r.service_overdue).length}</p></Card>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>EV / hybrid</p><p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{rows.filter((r) => r.fuel === "ev" || r.fuel === "hybrid").length}</p></Card>
        <Card><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Lifetime CO₂ (kg)</p><p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{Math.round(totalCo2).toLocaleString()}</p></Card>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Rego</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Vehicle</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Kind</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Fuel</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Odo (km)</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Next service</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontWeight: 600 }}>{v.rego}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{v.year ?? ""} {v.make} {v.model}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{v.kind}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  <span style={{
                    fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 600,
                    color: v.fuel === "ev" ? "#047857" : "var(--text-secondary)",
                  }}>{v.fuel}</span>
                </td>
                <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>{v.odometer_km.toLocaleString()}</td>
                <td style={{ padding: "0.5rem 0.75rem", color: v.service_overdue ? "var(--danger)" : undefined, fontWeight: v.service_overdue ? 600 : undefined }}>
                  {v.next_service_due ? new Date(v.next_service_due).toLocaleDateString() : "—"}
                  {v.service_overdue && " (overdue)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
