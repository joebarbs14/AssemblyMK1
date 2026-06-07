import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type Me, type WaterTariffRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { TariffsEditor } from "./TariffsEditor";

export default async function TariffsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<WaterTariffRow[]>("/api/staff/water/tariffs", { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Water tariffs
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Tiered per-kL prices for each customer type per FY. Tier rows must form a contiguous
        schedule; leave the upper bound blank on the top tier.
      </p>
      <TariffsEditor token={token} initial={rows} />
    </StaffShell>
  );
}
