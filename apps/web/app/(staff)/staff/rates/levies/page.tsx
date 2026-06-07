import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me, type RateLevyRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { LeviesEditor } from "./LeviesEditor";

export default async function LeviesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<RateLevyRow[]>("/api/staff/rates/levies", { token });

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Rate levies
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Non-ad-valorem charges that sit alongside the general rate: stormwater management
        (sect.496A), domestic waste management (sect.496), and council-set special rates.
      </p>
      <LeviesEditor token={token} initial={rows} />
    </StaffShell>
  );
}
