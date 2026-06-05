import { redirect } from "next/navigation";

import { api, type AdminUser, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { UsersTable } from "./UsersTable";

export default async function AdminUsersPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "admin") redirect("/account");

  const users = await api<AdminUser[]>("/api/admin/users", { token });

  return (
    <AdminShell me={me} active="users">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1rem" }}>Users</h1>
      <UsersTable initial={users} token={token} />
    </AdminShell>
  );
}
