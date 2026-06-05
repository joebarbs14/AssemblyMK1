import { redirect } from "next/navigation";

import { api, type Announcement, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { StaffShell } from "../../StaffShell";
import { AnnouncementsAdmin } from "./AnnouncementsAdmin";

export default async function StaffAnnouncementsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  const items = await api<Announcement[]>("/api/staff/announcements", { token });

  return (
    <StaffShell me={me} active="inbox">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1rem" }}>Announcements</h1>
      <AnnouncementsAdmin initialItems={items} token={token} />
    </StaffShell>
  );
}
