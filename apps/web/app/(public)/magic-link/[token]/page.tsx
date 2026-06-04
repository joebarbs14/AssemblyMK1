import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import { setSessionCookie } from "@/lib/session";

interface TokenOut {
  access_token: string;
  expires_in: number;
}

export default async function VerifyMagicLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let error: string | null = null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/magic-link/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Council-Slug": DEFAULT_COUNCIL_SLUG },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      error = data.detail ?? "This link can't be used.";
    } else {
      const out = (await res.json()) as TokenOut;
      await setSessionCookie(out.access_token, out.expires_in);
      redirect("/account");
    }
  } catch {
    error = "Couldn't reach the server. Try again.";
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.25rem" }}>
        Sign-in link
      </h2>
      <p role="alert" style={{ color: "var(--danger)", marginBottom: "1rem" }}>
        {error ?? "Unknown error."}
      </p>
      <p style={{ margin: 0, fontSize: "0.875rem" }}>
        <a href="/login">Request a new link</a>
      </p>
    </Card>
  );
}
