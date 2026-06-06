import { redirect } from "next/navigation";

import { api, type AdminTenderRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { TendersAdmin } from "./TendersAdmin";

export default async function AdminTendersPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<AdminTenderRow[]>("/api/admin/tenders", { token });

  return (
    <AdminShell me={me} active="tenders">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Tenders</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Open tenders, close them after the deadline, then award. Awarded contracts appear on
        the public procurement page with a local-supplier flag.
      </p>
      <TendersAdmin token={token} initial={rows} />
    </AdminShell>
  );
}
