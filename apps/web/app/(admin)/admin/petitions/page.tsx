import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type Me, type PetitionRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdminShell } from "../../AdminShell";
import { PetitionResponder } from "./PetitionResponder";

export default async function AdminPetitionsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const me = await api<Me>("/api/auth/me", { token });
  if (me.role !== "staff" && me.role !== "admin") redirect("/account");
  const rows = await api<PetitionRow[]>("/api/petitions", { token });

  const review = rows.filter((p) => p.status === "review");
  const open = rows.filter((p) => p.status === "open");
  const responded = rows.filter((p) => p.status === "responded");

  return (
    <AdminShell me={me} active="petitions">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Petitions</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Petitions awaiting council review are first. Posting a response moves them to responded.
      </p>

      <Section title={`Awaiting response (${review.length})`} accent="#dc2626">
        {review.map((p) => <Row key={p.id} p={p} token={token} canRespond />)}
        {review.length === 0 && <Empty msg="Nothing in the queue." />}
      </Section>
      <Section title={`Active (${open.length})`} accent="var(--brand)">
        {open.map((p) => <Row key={p.id} p={p} token={token} canRespond={false} />)}
        {open.length === 0 && <Empty msg="No active petitions." />}
      </Section>
      <Section title={`Responded (${responded.length})`} accent="#047857">
        {responded.map((p) => <Row key={p.id} p={p} token={token} canRespond={false} />)}
        {responded.length === 0 && <Empty msg="None yet." />}
      </Section>
    </AdminShell>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{
        fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: accent, margin: "0 0 0.5rem",
      }}>{title}</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {children}
      </ul>
    </section>
  );
}

function Row({ p, token, canRespond }: { p: PetitionRow; token: string; canRespond: boolean }) {
  const pct = Math.min(100, (p.signature_count / p.threshold) * 100);
  return (
    <li>
      <Card>
        <p style={{ margin: 0, fontWeight: 600 }}>{p.title}</p>
        <p style={{ margin: "0.25rem 0", fontSize: "0.875rem" }}>{p.summary}</p>
        <div style={{ marginTop: "0.5rem", height: 6, background: "var(--surface-muted)",
                       borderRadius: "var(--r-full)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%",
                         background: pct >= 100 ? "#047857" : "var(--brand)" }} />
        </div>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {p.signature_count}/{p.threshold} signatures
        </p>
        {p.council_response && (
          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--surface-muted)",
                         borderLeft: "3px solid var(--brand)", borderRadius: "var(--r-sm)" }}>
            <p style={{ margin: 0, fontSize: "0.8125rem" }}><strong>Response:</strong> {p.council_response}</p>
          </div>
        )}
        {canRespond && <PetitionResponder token={token} petitionId={p.id} />}
      </Card>
    </li>
  );
}

function Empty({ msg }: { msg: string }) {
  return <li><Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>{msg}</p></Card></li>;
}
