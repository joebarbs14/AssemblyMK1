"use client";

import * as React from "react";

import { Timeline } from "@/components/Timeline";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { ReportEvent } from "@/lib/api";

interface Props {
  reportId: number;
  initialEvents: ReportEvent[];
  mineUserId: number;
  /** "resident" uses /api/reports/:id/events/stream; "staff" uses staff path. */
  side: "resident" | "staff";
}

export function LiveTimeline({ reportId, initialEvents, mineUserId, side }: Props) {
  const [events, setEvents] = React.useState<ReportEvent[]>(initialEvents);

  React.useEffect(() => {
    const base = side === "staff" ? "/api/staff/reports" : "/api/reports";
    // EventSource sends a cookie automatically only on same-origin; we proxy via Next.
    const url = `${API_BASE}${base}/${reportId}/events/stream`;
    // Bearer auth is awkward for EventSource — we proxy through the Next.js API route
    // when origins differ. For same-origin dev with cookies, the API needs CORS+creds;
    // simpler path: use a Next route handler that proxies the SSE with the cookie token.
    const proxied = `/api/sse/reports/${reportId}?side=${side}`;
    const src = new EventSource(proxied);

    src.addEventListener("report.event", (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as ReportEvent;
        setEvents((cur) => (cur.some((x) => x.id === payload.id) ? cur : [...cur, payload]));
      } catch {
        // ignore malformed frames
      }
    });

    return () => src.close();
  }, [reportId, side]);

  return <Timeline events={events} mineUserId={mineUserId} />;
}
