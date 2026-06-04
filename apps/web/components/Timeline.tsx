import * as React from "react";

import type { ReportEvent } from "@/lib/api";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusChange({ event }: { event: ReportEvent }) {
  const md = event.metadata ?? {};
  const from = String(md.from ?? "");
  const to = String(md.to ?? "");
  return (
    <li style={systemRow}>
      <SystemBullet />
      <span>
        {event.actor_name ? `${event.actor_name} changed status` : "Status changed"}{" "}
        <strong>{from}</strong> → <strong>{to}</strong>
        {event.body ? ` — ${event.body}` : ""}
      </span>
      <time style={timeStyle}>{fmtTime(event.created_at)}</time>
    </li>
  );
}

function Assignment({ event }: { event: ReportEvent }) {
  const md = event.metadata ?? {};
  return (
    <li style={systemRow}>
      <SystemBullet />
      <span>
        {event.actor_name ? `${event.actor_name} reassigned` : "Auto-routed"}
        {md.to_team_name ? ` to ${md.to_team_name}` : ""}
        {event.body ? ` — ${event.body}` : ""}
      </span>
      <time style={timeStyle}>{fmtTime(event.created_at)}</time>
    </li>
  );
}

function FileRequest({ event }: { event: ReportEvent }) {
  return (
    <li style={fileRequestRow}>
      <strong style={{ display: "block", marginBottom: 4 }}>Council needs more from you</strong>
      <span>{event.body}</span>
      <time style={timeStyle}>{fmtTime(event.created_at)}</time>
    </li>
  );
}

function Message({ event, mineUserId }: { event: ReportEvent; mineUserId: number }) {
  const mine = event.actor_user_id === mineUserId;
  return (
    <li style={mine ? messageRowRight : messageRowLeft}>
      <div style={mine ? bubbleMine : bubbleTheirs}>
        {!mine && event.actor_name && (
          <span
            style={{
              display: "block",
              fontSize: "0.6875rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {event.actor_name}
          </span>
        )}
        <span style={{ whiteSpace: "pre-wrap" }}>{event.body}</span>
        <time
          style={{
            display: "block",
            fontSize: "0.6875rem",
            color: mine ? "rgba(255,255,255,0.7)" : "var(--text-secondary)",
            marginTop: 4,
          }}
        >
          {fmtTime(event.created_at)}
        </time>
      </div>
    </li>
  );
}

export function Timeline({
  events,
  mineUserId,
}: {
  events: ReportEvent[];
  mineUserId: number;
}) {
  if (events.length === 0) {
    return (
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        Nothing here yet. Council will respond soon — you'll see updates here.
      </p>
    );
  }
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {events.map((e) => {
        switch (e.kind) {
          case "status_change":
            return <StatusChange key={e.id} event={e} />;
          case "assignment":
            return <Assignment key={e.id} event={e} />;
          case "file_request":
            return <FileRequest key={e.id} event={e} />;
          case "message":
            return <Message key={e.id} event={e} mineUserId={mineUserId} />;
          default:
            return (
              <li key={e.id} style={systemRow}>
                <SystemBullet />
                <span>{e.kind}</span>
                <time style={timeStyle}>{fmtTime(e.created_at)}</time>
              </li>
            );
        }
      })}
    </ol>
  );
}

const systemRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: "0.8125rem",
  color: "var(--text-secondary)",
  padding: "0.25rem 0",
};

const timeStyle: React.CSSProperties = { marginLeft: "auto", fontSize: "0.6875rem" };

function SystemBullet() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--border)",
        flexShrink: 0,
      }}
    />
  );
}

const messageRowLeft: React.CSSProperties = { display: "flex", justifyContent: "flex-start" };
const messageRowRight: React.CSSProperties = { display: "flex", justifyContent: "flex-end" };
const bubbleBase: React.CSSProperties = {
  maxWidth: "75%",
  padding: "0.625rem 0.875rem",
  borderRadius: "var(--r-lg)",
  fontSize: "0.9375rem",
  lineHeight: 1.4,
};
const bubbleMine: React.CSSProperties = { ...bubbleBase, background: "var(--brand)", color: "var(--brand-fg)" };
const bubbleTheirs: React.CSSProperties = {
  ...bubbleBase,
  background: "var(--surface)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
};
const fileRequestRow: React.CSSProperties = {
  border: "1px solid #f3d28a",
  background: "#fff8e6",
  borderRadius: "var(--r-md)",
  padding: "0.75rem 0.875rem",
  fontSize: "0.875rem",
  color: "#7a4b08",
};
