import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, type Me, type ReportListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { StaffShell } from "../../StaffShell";

export default async function StaffInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; sla_at_risk?: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.status) qs.set("status", sp.status);
  if (sp.mine) qs.set("mine", "true");
  if (sp.sla_at_risk) qs.set("sla_at_risk", "true");
  const items = await api<ReportListItem[]>(
    `/api/staff/reports${qs.toString() ? "?" + qs.toString() : ""}`,
    { token },
  );

  return (
    <StaffShell me={me} active="inbox">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Inbox</h1>
      </header>

      <nav style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
        <FilterChip href="/staff/inbox" label="All open" active={!sp.status && !sp.mine && !sp.sla_at_risk} />
        <FilterChip href="/staff/inbox?mine=true" label="My assignments" active={!!sp.mine} />
        <FilterChip href="/staff/inbox?sla_at_risk=true" label="SLA at risk" active={!!sp.sla_at_risk} />
        <FilterChip href="/staff/inbox?status=new" label="New" active={sp.status === "new"} />
        <FilterChip href="/staff/inbox?status=in_progress" label="In progress" active={sp.status === "in_progress"} />
        <FilterChip href="/staff/inbox?status=awaiting_resident" label="Awaiting resident" active={sp.status === "awaiting_resident"} />
        <FilterChip href="/staff/inbox?status=resolved" label="Resolved" active={sp.status === "resolved"} />
      </nav>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}
      >
        {items.length === 0 ? (
          <p style={{ padding: "2rem", color: "var(--text-secondary)", margin: 0 }}>
            Nothing here.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Assignee</Th>
                <Th>Filed</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>
                    <Link
                      href={`/staff/reports/${r.id}`}
                      style={{ textDecoration: "none", color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      {r.title}
                    </Link>
                  </Td>
                  <Td muted>{r.category_label}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td muted>{r.assignee_name ?? "—"}</Td>
                  <Td muted>
                    {new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </StaffShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "0.625rem 0.875rem", fontWeight: 600, fontSize: "0.6875rem" }}>
      {children}
    </th>
  );
}
function Td({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      style={{
        padding: "0.625rem 0.875rem",
        fontSize: "0.875rem",
        color: muted ? "var(--text-secondary)" : "var(--text-primary)",
      }}
    >
      {children}
    </td>
  );
}
function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: "0.25rem 0.625rem",
        fontSize: "0.8125rem",
        borderRadius: "var(--r-full)",
        background: active ? "var(--brand)" : "var(--surface)",
        color: active ? "var(--brand-fg)" : "var(--text-primary)",
        textDecoration: "none",
        border: "1px solid var(--border)",
      }}
    >
      {label}
    </Link>
  );
}
