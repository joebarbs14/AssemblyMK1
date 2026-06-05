import * as React from "react";

import type { ReportStatus } from "@/lib/api";

const STATUS_LABEL: Record<ReportStatus, string> = {
  new: "New",
  triaging: "Triaging",
  assigned: "Assigned",
  in_progress: "In progress",
  awaiting_resident: "Awaiting you",
  resolved: "Resolved",
  closed: "Closed",
  duplicate: "Duplicate",
  rejected: "Rejected",
};

const STATUS_COLOURS: Record<ReportStatus, { bg: string; fg: string }> = {
  new: { bg: "#eaf2ff", fg: "#1e5bba" },
  triaging: { bg: "#eaf2ff", fg: "#1e5bba" },
  assigned: { bg: "#e8eef9", fg: "#0f3b7a" },
  in_progress: { bg: "#faf3df", fg: "#9b7d3e" },
  awaiting_resident: { bg: "#faf3df", fg: "#9b7d3e" },
  resolved: { bg: "#ecfdf3", fg: "#067647" },
  closed: { bg: "#f4f7fb", fg: "#4a5b70" },
  duplicate: { bg: "#f4f7fb", fg: "#4a5b70" },
  rejected: { bg: "#fef2f2", fg: "#b91c1c" },
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const c = STATUS_COLOURS[status];
  return (
    <span
      role="status"
      aria-label={`Status: ${STATUS_LABEL[status]}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0.125rem 0.625rem",
        background: c.bg,
        color: c.fg,
        borderRadius: "var(--r-full)",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: "50%", background: c.fg }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
