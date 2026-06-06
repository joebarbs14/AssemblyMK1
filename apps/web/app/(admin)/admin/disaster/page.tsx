import { redirect } from "next/navigation";

import {
  api,
  type DisasterAlertRow,
  type EvacCentreRow,
  type FireBanRow,
  type Me,
  type SandbagDepotRow,
} from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { DisasterAdmin } from "./DisasterAdmin";

export default async function AdminDisasterPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");

  const [alerts, evac, sandbags, ban] = await Promise.all([
    api<DisasterAlertRow[]>("/api/disaster/alerts", { token }),
    api<EvacCentreRow[]>("/api/disaster/evac-centres", { token }),
    api<SandbagDepotRow[]>("/api/disaster/sandbags", { token }),
    api<FireBanRow | null>("/api/fire-bans/current", { token }).catch(() => null),
  ]);

  return (
    <AdminShell me={me} active="disaster">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Disaster ops</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Publish alerts, toggle evac centre status, update sandbag stocks, declare fire bans.
        Resident pages update on next load.
      </p>
      <DisasterAdmin token={token} alerts={alerts} evac={evac} sandbags={sandbags} ban={ban} />
    </AdminShell>
  );
}
