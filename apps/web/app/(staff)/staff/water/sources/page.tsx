import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { Card } from "@/components/ui/Card";
import { api, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

interface SourceRow {
  id: number; name: string; kind: string;
  capacity_ml: number; latest_pct: number | null;
  latest_date: string | null;
}

export default async function SourcesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<SourceRow[]>("/api/staff/water/sources", { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Water sources
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Dams, weirs, bores and reservoirs. Daily readings drive the public storage % shown to residents.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0,
                   display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map((s) => (
          <li key={s.id}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {s.name} <span style={{ color: "var(--text-secondary)" }}>· {s.kind}</span>
                </p>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {s.latest_pct?.toFixed(1) ?? "—"}%
                </p>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Capacity {s.capacity_ml.toLocaleString()} ML ·{" "}
                {s.latest_date ? `last reading ${new Date(s.latest_date).toLocaleDateString()}` : "no readings"}
              </p>
            </Card>
          </li>
        ))}
        {rows.length === 0 && (
          <li><p style={{ color: "var(--text-secondary)" }}>No sources configured.</p></li>
        )}
      </ul>
    </StaffShell>
  );
}
