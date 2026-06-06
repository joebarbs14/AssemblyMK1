import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type PbRoundRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { PbVoter } from "./PbVoter";

export default async function PbPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const round = await api<PbRoundRow | null>("/api/pb/current", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Community choice budget
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        You decide where part of our capital budget goes. One vote per resident, allocate your
        tokens across the projects you want most.
      </p>

      {round === null ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            No round currently open. Check back later.
          </p>
        </Card>
      ) : (
        <PbVoter token={token} initial={round} />
      )}
    </main>
  );
}
