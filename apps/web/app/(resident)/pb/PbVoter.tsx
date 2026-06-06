"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type PbRoundRow } from "@/lib/api";

export function PbVoter({ token, initial }: { token: string; initial: PbRoundRow }) {
  const [round, setRound] = useState<PbRoundRow>(initial);
  const [drafts, setDrafts] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const draftSum = useMemo(
    () => Object.values(drafts).reduce((a, b) => a + b, 0),
    [drafts],
  );
  const projected = round.tokens_remaining - draftSum;

  function bump(pid: number, delta: number) {
    setDrafts((d) => {
      const next = { ...d, [pid]: Math.max(0, (d[pid] ?? 0) + delta) };
      if (next[pid] === 0) delete next[pid];
      return next;
    });
  }

  async function submit(pid: number) {
    const tokens = drafts[pid];
    if (!tokens) return;
    setBusy(pid);
    setError(null);
    try {
      const r = await api<{ tokens_remaining: number }>("/api/pb/vote", {
        method: "POST", token, body: { project_id: pid, tokens },
      });
      setRound((prev) => ({
        ...prev,
        tokens_remaining: r.tokens_remaining,
        projects: prev.projects.map((p) =>
          p.id === pid ? { ...p, votes_tokens: p.votes_tokens + tokens } : p,
        ),
      }));
      setDrafts((d) => {
        const n = { ...d };
        delete n[pid];
        return n;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>{round.title}</h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem" }}>{round.description}</p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.875rem" }}>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Pool: </span>
            <strong><Money cents={round.pool_cents} /></strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Tokens left: </span>
            <strong style={{ color: projected < 0 ? "var(--danger)" : undefined }}>
              {projected} / {round.tokens_per_voter}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Closes: </span>
            <strong>{new Date(round.closes_at).toLocaleDateString()}</strong>
          </div>
        </div>
        {error && <p style={{ margin: "0.5rem 0 0", color: "var(--danger)" }}>{error}</p>}
      </Card>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {round.projects.map((p) => {
          const draft = drafts[p.id] ?? 0;
          return (
            <li key={p.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{p.title}</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Requested <Money cents={p.requested_cents} />
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{p.votes_tokens}</p>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary)" }}>tokens</p>
                  </div>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>{p.description}</p>
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Button size="sm" variant="ghost" onClick={() => bump(p.id, -1)} disabled={draft <= 0}>−</Button>
                  <span style={{ minWidth: 36, textAlign: "center", fontWeight: 600 }}>{draft}</span>
                  <Button size="sm" variant="ghost" onClick={() => bump(p.id, +1)} disabled={projected <= 0}>+</Button>
                  <span style={{ flex: 1 }} />
                  <Button size="sm" onClick={() => submit(p.id)} disabled={draft === 0 || busy === p.id}>
                    {busy === p.id ? "Casting…" : `Cast ${draft}`}
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
