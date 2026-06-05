import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type CampaignRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { DonateButton } from "./DonateButton";

export default async function DonationsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const campaigns = await api<CampaignRow[]>("/api/donations/campaigns", { token });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Community fund
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Help fund local projects. 100% of donations go to the project.
      </p>

      {campaigns.length === 0 ? (
        <Card><p style={{ color: "var(--text-secondary)", margin: 0 }}>No active campaigns.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {campaigns.map((c) => (
            <li key={c.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700 }}>{c.title}</h2>
                  <span style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 8px",
                    borderRadius: "var(--r-full)",
                    background: c.status === "funded" ? "var(--success-soft)" : "var(--gold-soft)",
                    color: c.status === "funded" ? "var(--success)" : "var(--gold-deep)",
                  }}>
                    {c.status}
                  </span>
                </div>
                <p style={{ margin: "0.375rem 0", color: "var(--text-secondary)" }}>{c.blurb}</p>
                <div aria-hidden="true" style={{ height: 8, background: "var(--surface-muted)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.progress_pct}%`, background: c.status === "funded" ? "var(--success)" : "var(--gold)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6, fontSize: "0.8125rem" }}>
                  <span><Money cents={c.raised_cents} /> of <Money cents={c.target_cents} /></span>
                  <span style={{ color: "var(--text-secondary)" }}>{c.progress_pct}%</span>
                </div>
                {c.status === "active" && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <DonateButton campaignId={c.id} />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
