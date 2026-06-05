import { redirect } from "next/navigation";
import Link from "next/link";

import { api, type MapReportRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { ReportsMap } from "./ReportsMap";

export default async function MapPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const [me, points] = await Promise.all([
    api<Me>("/api/auth/me", { token }),
    api<MapReportRow[]>("/api/reports/map", { token }).catch(() => [] as MapReportRow[]),
  ]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.25rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Reports near you
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Open reports in {me.council.name} from the last 30 days. Helps avoid duplicates.
      </p>
      <ReportsMap initialPoints={points} />
      <p style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", marginTop: "0.5rem" }}>
        Tiles © OpenStreetMap contributors · Map by MapLibre GL JS (BSD-3) — FOSS stack.
      </p>
    </main>
  );
}
