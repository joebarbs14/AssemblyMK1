import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffShell } from "@/app/(staff)/StaffShell";
import { Card } from "@/components/ui/Card";
import { api, type Me, type WaterQualityRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { QualityEntry } from "./QualityEntry";

export default async function QualityPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<WaterQualityRow[]>("/api/staff/water/quality?days=60", { token });

  return (
    <StaffShell me={me} active="water">
      <Link href="/staff/water" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Water</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Drinking-water quality
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: 640 }}>
        Log lab samples per sample point. Compliance is auto-computed against ADWG guidelines
        (free Cl 0.2-5 mg/L · pH 6.5-8.5 · turbidity &lt; 5 NTU · fluoride 0.6-1.5 mg/L · E.coli = 0).
      </p>
      <QualityEntry token={token} />
      <h2 style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text-secondary)",
                    margin: "1.25rem 0 0.5rem" }}>
        Recent samples
      </h2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={head}>
              <th style={cell}>Point</th>
              <th style={cell}>Taken</th>
              <th style={cell}>Cl</th>
              <th style={cell}>pH</th>
              <th style={cell}>NTU</th>
              <th style={cell}>F</th>
              <th style={cell}>E.coli</th>
              <th style={cell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={cell}>{q.sample_point}</td>
                <td style={cell}>{new Date(q.taken_at).toLocaleDateString()}</td>
                <td style={cell}>{q.chlorine_mg_per_l?.toFixed(2) ?? "—"}</td>
                <td style={cell}>{q.ph?.toFixed(1) ?? "—"}</td>
                <td style={cell}>{q.turbidity_ntu?.toFixed(1) ?? "—"}</td>
                <td style={cell}>{q.fluoride_mg_per_l?.toFixed(2) ?? "—"}</td>
                <td style={cell}>{q.e_coli_per_100ml ?? "—"}</td>
                <td style={cell}>
                  <span style={{
                    padding: "0.125rem 0.5rem", fontSize: "0.65rem", fontWeight: 700,
                    textTransform: "uppercase", color: "#fff",
                    background: q.compliance === "pass" ? "#047857"
                      : q.compliance === "borderline" ? "#C9A24B" : "#dc2626",
                    borderRadius: "var(--r-full)",
                  }}>{q.compliance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </StaffShell>
  );
}

const cell: React.CSSProperties = { padding: "0.5rem 0.625rem", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = {
  background: "var(--surface-muted)", textTransform: "uppercase",
  fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--text-secondary)",
};
