import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me, type RateCategoryRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { CategoriesEditor } from "./CategoriesEditor";

export default async function CategoriesPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const cats = await api<RateCategoryRow[]>("/api/staff/rates/categories", { token });

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Rate categories
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        One row per category × fiscal year. The ad valorem rate is dollars-of-rate per dollar of UV
        (e.g. <code>0.003421</code> means $3.42 per $1,000 of land value). The minimum applies
        when the ad valorem calculation comes in below it.
      </p>
      <CategoriesEditor token={token} initial={cats} />
    </StaffShell>
  );
}
