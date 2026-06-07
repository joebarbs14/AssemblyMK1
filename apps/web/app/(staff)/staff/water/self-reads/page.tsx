import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { SelfReadsQueue } from "./SelfReadsQueue";

interface SelfReadRow {
  id: number; property_id: number; address: string;
  read_on: string; value_kl: number; status: string;
  photo_r2_key: string | null; note: string | null;
  submitted_by_user_id: number; created_at: string;
}

export default async function SelfReadsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<SelfReadRow[]>("/api/staff/water/self-reads?status=pending", { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Self-read approvals
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Resident-submitted meter reads. Cross-check the photo (if provided) before accepting
        or disputing. The ratepayer is notified of your decision.
      </p>
      <SelfReadsQueue token={token} initial={rows} />
    </StaffShell>
  );
}
