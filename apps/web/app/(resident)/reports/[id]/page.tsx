import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { api, type Me, type ReportDetail, type ReportEvent } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { MessageComposer } from "./MessageComposer";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId)) redirect("/reports");

  let report: ReportDetail;
  let events: ReportEvent[];
  let me: Me;
  try {
    [report, events, me] = await Promise.all([
      api<ReportDetail>(`/api/reports/${reportId}`, { token }),
      api<ReportEvent[]>(`/api/reports/${reportId}/events`, { token }),
      api<Me>("/api/auth/me", { token }),
    ]);
  } catch {
    redirect("/reports");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1.25rem 7rem" }}>
      <Link
        href="/reports"
        style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
      >
        ← All reports
      </Link>

      <header style={{ margin: "0.75rem 0 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <StatusBadge status={report.status} />
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {report.category_label}
          </span>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>{report.title}</h1>
        {report.description && (
          <p style={{ marginTop: "0.5rem", marginBottom: 0, color: "var(--text-secondary)" }}>
            {report.description}
          </p>
        )}
        <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          {report.address_text ?? (report.lat != null ? `${report.lat.toFixed(5)}, ${report.lng?.toFixed(5)}` : "No location")}{" "}
          · Filed {new Date(report.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
          {report.team_name ? ` · with ${report.team_name}` : ""}
        </p>
      </header>

      <Card style={{ padding: "1.25rem" }}>
        <Timeline events={events} mineUserId={me.id} />
      </Card>

      <MessageComposer reportId={report.id} token={token} />
    </main>
  );
}
