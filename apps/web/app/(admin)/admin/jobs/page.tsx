import { redirect } from "next/navigation";

import { api, type AdminJobRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { JobsAdmin } from "./JobsAdmin";

export default async function AdminJobsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<AdminJobRow[]>("/api/admin/jobs", { token });

  return (
    <AdminShell me={me} active="jobs">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Jobs</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Post council and partner roles; the listings show on the public jobs board.
      </p>
      <JobsAdmin token={token} initial={rows} />
    </AdminShell>
  );
}
