import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, type ReportListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function ReportsListPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let reports: ReportListItem[] = [];
  try {
    reports = await api<ReportListItem[]>("/api/reports", { token });
  } catch {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>My reports</h1>
        <Link href="/reports/new">
          <Button size="sm">+ New report</Button>
        </Link>
      </header>

      {reports.length === 0 ? (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>No reports yet</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            See something that needs council attention? Let them know.
          </p>
          <Link href="/reports/new">
            <Button>Report an issue</Button>
          </Link>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/reports/${r.id}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <Card style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <StatusBadge status={r.status} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {r.category_label}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1rem", margin: 0, fontWeight: 600 }}>{r.title}</h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {new Date(r.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {r.assignee_name ? ` · with ${r.assignee_name}` : ""}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
