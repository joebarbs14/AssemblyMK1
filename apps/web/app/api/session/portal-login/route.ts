import { NextResponse } from "next/server";
import { z } from "zod";

import { api, type TokenOut } from "@/lib/api";
import { API_BASE } from "@/lib/env";
import { setSessionCookie } from "@/lib/session";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function flattenDetail(d: unknown): string {
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((e: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(e.loc) ? e.loc.slice(-1)[0] : "";
        return `${field}: ${e.msg ?? "invalid"}`;
      })
      .join("; ");
  }
  if (d && typeof d === "object" && "msg" in d) {
    return String((d as { msg: unknown }).msg);
  }
  return "Login failed";
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }

  try {
    const out = await api<TokenOut>("/api/auth/portal-login", {
      method: "POST",
      body: { email: parsed.data.email, password: parsed.data.password },
    });
    await setSessionCookie(out.access_token, out.expires_in);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as { status?: number; detail?: unknown };
    const message = flattenDetail(e.detail);
    console.error(
      "[session/portal-login] upstream failed",
      JSON.stringify({ api_base: API_BASE, status: e.status, detail: e.detail }),
    );
    return NextResponse.json(
      { detail: message, upstream_status: e.status ?? null },
      { status: e.status ?? 500 },
    );
  }
}
