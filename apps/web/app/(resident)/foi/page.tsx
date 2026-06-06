import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type InfoRequestRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { FoiForm } from "./FoiForm";
import { WithdrawButton } from "./WithdrawButton";

const STATUS_COLOR: Record<string, string> = {
  received: "#6b7280",
  assessing: "#C9A24B",
  fees_quoted: "#C9A24B",
  decided: "#047857",
  released: "#047857",
  refused: "#dc2626",
  withdrawn: "#6b7280",
};

export default async function FoiPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const mine = await api<InfoRequestRow[]>("/api/foi/mine", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Information access (GIPA)
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Request access to council records under the NSW GIPA Act. Informal first — formal
        applications cost $30 and we have 20 working days to respond.
      </p>

      <FoiForm token={token} />

      {mine.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" }}>Your requests</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {mine.map((r) => (
              <li key={r.id}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{r.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {r.reference} · {r.kind} · due {new Date(r.due_by).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", alignItems: "flex-end" }}>
                      <span style={{
                        padding: "0.125rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff",
                        background: STATUS_COLOR[r.status] ?? "#6b7280", borderRadius: "var(--r-full)",
                      }}>{r.status.replace("_", " ")}</span>
                      {!["decided", "released", "refused", "withdrawn"].includes(r.status) && (
                        <WithdrawButton token={token} requestId={r.id} />
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
