import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

const DATASETS = [
  { name: "Budget lines", file: "budget.csv", desc: "Council budget — revenue, expense and category, fiscal year." },
  { name: "Service reports", file: "reports.csv", desc: "Public reports — category, status, lat/lng, SLA." },
  { name: "Capital projects", file: "projects.csv", desc: "Capital works — budget, spent, completion status." },
];

export default function OpenDataPage() {
  const slug = DEFAULT_COUNCIL_SLUG;
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Open data
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Council data, free to download and reuse under CC-BY 4.0. Build on it — apps, dashboards,
        journalism. CSV today, GeoJSON & STA-compatible feeds coming.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {DATASETS.map((d) => (
          <li key={d.file}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{d.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {d.desc}
                  </p>
                </div>
                <a
                  href={`${API_BASE}/api/public/open-data/${d.file}?council_slug=${slug}`}
                  style={{
                    padding: "0.375rem 0.75rem", background: "var(--brand)", color: "var(--brand-fg)",
                    borderRadius: "var(--r-md)", fontSize: "0.8125rem", fontWeight: 600,
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >Download CSV</a>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
        Index endpoint: <code>/api/public/open-data/index?council_slug={slug}</code>
      </p>
    </main>
  );
}
