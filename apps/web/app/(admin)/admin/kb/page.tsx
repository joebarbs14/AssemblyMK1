import { redirect } from "next/navigation";

import { api, type KbArticleAdminRow, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { KbEditor } from "./KbEditor";

export default async function AdminKbPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<KbArticleAdminRow[]>("/api/admin/kb", { token });

  return (
    <AdminShell me={me} active="kb">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>FAQ articles</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        These articles are the chatbot&apos;s knowledge base. Each answer cites the article it came from.
      </p>
      <KbEditor token={token} initial={rows} />
    </AdminShell>
  );
}
