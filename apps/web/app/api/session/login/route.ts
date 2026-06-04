import { NextResponse } from "next/server";
import { z } from "zod";

import { api, type TokenOut } from "@/lib/api";
import { API_BASE } from "@/lib/env";
import { setSessionCookie } from "@/lib/session";

const BodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("password"),
    email: z.string().email(),
    password: z.string().min(1),
  }),
  z.object({
    kind: z.literal("magic-link"),
    token: z.string().min(10),
  }),
  z.object({
    kind: z.literal("register"),
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(12),
  }),
]);

function flattenDetail(d: unknown): string {
  // FastAPI 422 detail is an array of {loc, msg, type, ...}. Make it readable.
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
    console.error("[session/login] zod validation failed", parsed.error.flatten());
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }

  const path =
    parsed.data.kind === "password"
      ? "/api/auth/password/login"
      : parsed.data.kind === "register"
        ? "/api/auth/register"
        : "/api/auth/magic-link/verify";

  const body =
    parsed.data.kind === "password"
      ? { email: parsed.data.email, password: parsed.data.password }
      : parsed.data.kind === "register"
        ? { email: parsed.data.email, name: parsed.data.name, password: parsed.data.password }
        : { token: parsed.data.token };

  try {
    const out = await api<TokenOut>(path, { method: "POST", body });
    await setSessionCookie(out.access_token, out.expires_in);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as { status?: number; detail?: unknown };
    const message = flattenDetail(e.detail);
    console.error(
      "[session/login] upstream failed",
      JSON.stringify({
        api_base: API_BASE,
        path,
        kind: parsed.data.kind,
        status: e.status,
        detail: e.detail,
      }),
    );
    return NextResponse.json(
      { detail: message, upstream_status: e.status ?? null, api_base: API_BASE },
      { status: e.status ?? 500 },
    );
  }
}
