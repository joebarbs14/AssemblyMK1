import { NextRequest } from "next/server";

import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import { readSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await readSessionToken();
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const side = req.nextUrl.searchParams.get("side") === "staff" ? "staff" : "resident";
  const upstreamPath =
    side === "staff" ? `/api/staff/reports/${id}/events/stream` : `/api/reports/${id}/events/stream`;

  const upstream = await fetch(`${API_BASE}${upstreamPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
      Accept: "text/event-stream",
    },
    // Don't let Next.js cache an event stream.
    cache: "no-store",
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
