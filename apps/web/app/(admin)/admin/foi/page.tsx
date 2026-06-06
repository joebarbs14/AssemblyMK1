import { redirect } from "next/navigation";

import { api, type FoiQueueRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { FoiQueue } from "./FoiQueue";

export default async function AdminFoiPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<FoiQueueRow[]>("/api/admin/foi", { token });

  return (
    <AdminShell me={me} active="foi">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>GIPA queue</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Formal information access requests under the NSW GIPA Act. Move them through the workflow
        — applicants are notified on each transition.
      </p>
      <FoiQueue token={token} initial={rows} />
    </AdminShell>
  );
}
