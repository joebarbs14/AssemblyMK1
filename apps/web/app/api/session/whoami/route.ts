import { NextResponse } from "next/server";

import { readSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await readSessionToken();
  return NextResponse.json({ token });
}
