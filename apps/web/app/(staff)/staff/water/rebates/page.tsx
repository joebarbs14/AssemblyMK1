import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { RebatesQueue } from "./RebatesQueue";

interface RebateClaimRow {
  id: number; scheme_label: string;
  property_id: number; address: string;
  invoice_amount_cents: number; claim_amount_cents: number;
  status: string; receipt_url: string | null;
  created_at: string; decision_note: string | null;
}

export default async function RebatesQueuePage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<RebateClaimRow[]>("/api/staff/water/rebates/claims?status=lodged",
    { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Water rebate claims
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Lodged claims awaiting review. The annual cap per household is enforced automatically.
      </p>
      <RebatesQueue token={token} initial={rows} />
    </StaffShell>
  );
}
