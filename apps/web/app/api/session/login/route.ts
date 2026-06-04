import { NextResponse } from "next/server";
import { z } from "zod";

import { api, type TokenOut } from "@/lib/api";
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

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
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
    const e = err as { status?: number; detail?: string };
    return NextResponse.json(
      { detail: e.detail ?? "Login failed" },
      { status: e.status ?? 500 },
    );
  }
}
