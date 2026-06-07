import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me, type WaterRestrictionRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { RestrictionForm } from "./RestrictionForm";

export default async function RestrictionsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<WaterRestrictionRow[]>("/api/staff/water/restrictions", { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Water restrictions
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Set the level (0-5). The legal rules for that level auto-populate. Residents see the new
        rules and severity colour on the next visit to /water.
      </p>
      <RestrictionForm token={token} initial={rows} />
    </StaffShell>
  );
}
