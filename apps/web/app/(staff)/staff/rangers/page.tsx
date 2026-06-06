import Link from "next/link";
import { redirect } from "next/navigation";

import { api, type InfringementRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { InfringementsTable } from "./InfringementsTable";

const KINDS = ["parking", "animal", "litter", "signage"] as const;

const CODES: Record<string, { code: string; desc: string; fee_cents: number }[]> = {
  parking: [
    { code: "PK-01", desc: "No standing", fee_cents: 18000 },
    { code: "PK-02", desc: "Expired meter", fee_cents: 11000 },
    { code: "PK-03", desc: "Disabled bay misuse", fee_cents: 64400 },
  ],
  animal: [
    { code: "AN-01", desc: "Dog off lead", fee_cents: 27500 },
    { code: "AN-02", desc: "Unregistered animal", fee_cents: 18800 },
  ],
  litter: [
    { code: "LI-01", desc: "Small litter from vehicle", fee_cents: 25000 },
    { code: "LI-02", desc: "Illegal dumping", fee_cents: 250000 },
  ],
  signage: [
    { code: "SG-01", desc: "Unauthorised signage", fee_cents: 27500 },
  ],
};

export default async function RangersPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const issued = await api<InfringementRow[]>("/api/rangers/infringements", { token });

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/staff" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Staff console</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Rangers
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Issue infringements on patrol. Geo-tagged, photo evidence, in-app appeals.
      </p>

      <InfringementsTable token={token} initial={issued} kinds={[...KINDS]} codes={CODES} />
    </main>
  );
}
