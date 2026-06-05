import { NextResponse } from "next/server";

import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Lightweight diagnostic — surfaces what the web service thinks the API is
 * and whether it can reach it. Hit /api/diag in a browser to confirm:
 *   1. NEXT_PUBLIC_API_BASE is set correctly
 *   2. API service is reachable
 *   3. Demo council exists
 * Safe to leave on; reveals no secrets.
 */
export async function GET() {
  const out: Record<string, unknown> = {
    api_base: API_BASE,
    default_council_slug: DEFAULT_COUNCIL_SLUG,
    api_base_set_from_env: Boolean(
      process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE,
    ),
  };

  // Check API /health
  try {
    const r = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    out.api_health = { status: r.status, ok: r.ok };
    if (r.ok) out.api_health_body = await r.json();
  } catch (e) {
    out.api_health = { error: e instanceof Error ? e.message : String(e) };
  }

  // Check the council resolves
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { "X-Council-Slug": DEFAULT_COUNCIL_SLUG },
      cache: "no-store",
    });
    // We don't have a bearer; we expect 401 if council exists, 404 if not.
    out.council_probe = { status: r.status, body: await r.text() };
  } catch (e) {
    out.council_probe = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(out, { status: 200 });
}
