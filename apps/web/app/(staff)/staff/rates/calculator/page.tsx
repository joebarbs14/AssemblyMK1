import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me, type RateCategoryRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { Calculator } from "./Calculator";

export default async function CalculatorPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const cats = await api<RateCategoryRow[]>("/api/staff/rates/categories", { token });

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Ad valorem calculator
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Compute what a property would pay under the chosen category and unimproved value (UV).
        Formula: <code>max(minimum, base + UV × ad valorem)</code>. Concessions are deducted after.
      </p>
      <Calculator token={token} categories={cats} />
    </StaffShell>
  );
}
