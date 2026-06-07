import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type LeakAlertRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LeakActions } from "./LeakActions";

const COLOR: Record<string, string> = {
  suspected: "#dc2626",
  confirmed: "#991b1b",
  resolved: "#047857",
  false_positive: "#6b7280",
};

export default async function LeaksPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<LeakAlertRow[]>("/api/staff/water/leaks", { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Leak alerts
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Anomaly detection on smart-meter flow. Run a scan to pick up sustained spikes vs each
        property&apos;s baseline. Owners are notified automatically when a new alert fires.
      </p>
      <LeakActions token={token} initial={rows} />
      <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0",
                   display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map((l) => (
          <li key={l.id}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                           borderRadius: "var(--r-lg)", padding: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{l.address}</p>
                <span style={{
                  padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                  textTransform: "uppercase", color: "#fff",
                  background: COLOR[l.severity] ?? "#6b7280",
                  borderRadius: "var(--r-full)",
                }}>{l.severity}</span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.8125rem" }}>
                <strong>{l.flow_lph.toFixed(0)} L/h</strong> sustained · baseline{" "}
                {l.baseline_lph.toFixed(0)} L/h ·{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  detected {new Date(l.detected_at).toLocaleString()}
                </span>
              </p>
              {l.notes && (
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {l.notes}
                </p>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li><p style={{ color: "var(--text-secondary)" }}>No leak alerts.</p></li>
        )}
      </ul>
    </StaffShell>
  );
}
