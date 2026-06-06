import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type HardshipPlanRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { PlansQueue } from "./PlansQueue";

export default async function PlansPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<HardshipPlanRow[]>("/api/staff/rates/plans", { token });

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Hardship payment plans
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Sect.564 instalment arrangements. Approving a plan notifies the ratepayer and starts
        the monthly schedule.
      </p>
      <PlansQueue token={token} initial={rows} />
    </StaffShell>
  );
}
