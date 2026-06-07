import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { api, type CertificateRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { CertificateQueue } from "./CertificateQueue";

export default async function CertsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<CertificateRow[]>("/api/staff/rates/certificates", { token });

  return (
    <StaffShell me={me} active="rates">
      <Link href="/staff/rates" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Rates</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Section 603 certificates
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Solicitor-requested certificates for property settlements. Click <em>Issue</em> to lock
        in the snapshot and notify the requester; preview the printable PDF in a new tab.
      </p>
      <CertificateQueue token={token} initial={rows} />
    </StaffShell>
  );
}
