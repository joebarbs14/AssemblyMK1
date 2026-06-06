import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type GardenPlotRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { ApplyButton } from "./ApplyButton";

const STATUS_COLOR: Record<string, string> = {
  available: "#047857",
  assigned: "#6b7280",
  maintenance: "#C9A24B",
};

export default async function GardensPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<GardenPlotRow[]>("/api/gardens/plots", { token });

  const groups: Record<string, GardenPlotRow[]> = {};
  for (const r of rows) (groups[r.garden_name] ??= []).push(r);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Community gardens
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Apply for a plot at one of our community gardens. Available plots are assigned first-come;
        full gardens have a waitlist.
      </p>

      {Object.entries(groups).map(([garden, plots]) => (
        <section key={garden} style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>{garden}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid",
                       gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" }}>
            {plots.map((p) => (
              <li key={p.id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>Plot {p.plot_code}</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {p.size_sqm} m²
                      </p>
                    </div>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: STATUS_COLOR[p.status] ?? "#6b7280",
                      marginTop: 6,
                    }} title={p.status} />
                  </div>
                  <p style={{ margin: "0.5rem 0 0.5rem", fontSize: "0.8125rem" }}>
                    <Money cents={p.annual_fee_cents} />/yr
                  </p>
                  <ApplyButton token={token} plotId={p.id} status={p.status} />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
