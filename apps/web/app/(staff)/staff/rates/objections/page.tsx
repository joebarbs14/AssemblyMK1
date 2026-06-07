import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me, type ObjectionRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { ObjectionsQueue } from "./ObjectionsQueue";

export default async function ObjectionsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<ObjectionRow[]>("/api/staff/rates/objections", { token });

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Valuation objections
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Ratepayer objections to the Valuer General UV. Mark as upheld to flag for re-strike,
        or dismissed to record the outcome with a reason — the ratepayer is notified either way.
      </p>
      <ObjectionsQueue token={token} initial={rows} />
    </StaffShell>
  );
}
