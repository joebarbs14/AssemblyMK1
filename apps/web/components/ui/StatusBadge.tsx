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
  new: { bg: "#eef4ff", fg: "#175cd3" },
  triaging: { bg: "#eef4ff", fg: "#175cd3" },
  assigned: { bg: "#eef4ff", fg: "#175cd3" },
  in_progress: { bg: "#fff8e6", fg: "#b54708" },
  awaiting_resident: { bg: "#fff8e6", fg: "#b54708" },
  resolved: { bg: "#ecfdf3", fg: "#067647" },
  closed: { bg: "#f2f4f7", fg: "#475467" },
  duplicate: { bg: "#f2f4f7", fg: "#475467" },
  rejected: { bg: "#fee4e2", fg: "#b42318" },
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
