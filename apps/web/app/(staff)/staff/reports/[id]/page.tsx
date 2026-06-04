import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LiveTimeline } from "@/components/LiveTimeline";
import { api, type Me, type ReportDetail, type ReportEvent } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { StaffShell } from "../../../StaffShell";
import { StaffComposer } from "./StaffComposer";

export default async function StaffReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId)) redirect("/staff/inbox");

  let report: ReportDetail;
  let events: ReportEvent[];
  try {
    [report, events] = await Promise.all([
      api<ReportDetail>(`/api/staff/reports/${reportId}`, { token }),
      api<ReportEvent[]>(`/api/staff/reports/${reportId}/events`, { token }),
    ]);
  } catch {
    redirect("/staff/inbox");
  }

  return (
    <StaffShell me={me} active="inbox">
      <Link href="/staff/inbox" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Inbox
      </Link>

      <header style={{ margin: "0.75rem 0 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <StatusBadge status={report.status} />
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {report.category_label} · {report.priority}
          </span>
        </div>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 600, margin: 0 }}>{report.title}</h1>
        {report.description && (
          <p style={{ marginTop: "0.5rem", marginBottom: 0, color: "var(--text-secondary)" }}>
            {report.description}
          </p>
        )}
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: "1rem", alignItems: "start" }}>
        <Card style={{ padding: "1.25rem" }}>
          <LiveTimeline
            reportId={report.id}
            initialEvents={events}
            mineUserId={me.id}
            side="staff"
          />
          <StaffComposer reportId={report.id} token={token} />
        </Card>

        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
              Reporter
            </h3>
            <p style={{ margin: 0 }}>{report.reporter_name ?? `User #${report.reporter_user_id}`}</p>
          </Card>
          <Card style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
              Assignment
            </h3>
            <p style={{ margin: 0 }}>{report.assignee_name ?? "Unassigned"}</p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {report.team_name ?? "No team"}
            </p>
          </Card>
          <Card style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
              Location
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              {report.address_text ?? (report.lat != null ? `${report.lat.toFixed(5)}, ${report.lng?.toFixed(5)}` : "Not provided")}
            </p>
          </Card>
          {report.sla_due_at && (
            <Card style={{ padding: "1rem" }}>
              <h3 style={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
                SLA
              </h3>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                Due {new Date(report.sla_due_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </StaffShell>
  );
}
