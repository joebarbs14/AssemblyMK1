import { redirect } from "next/navigation";

import { api, type Me, type SurveyRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { SurveyDashboard } from "./SurveyDashboard";

export default async function AdminSurveysPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<SurveyRow[]>("/api/surveys", { token });

  return (
    <AdminShell me={me} active="surveys">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Surveys</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Polls, NPS scores and consultation surveys. Click into one to see live tallies.
      </p>
      <SurveyDashboard token={token} initial={rows} />
    </AdminShell>
  );
}
