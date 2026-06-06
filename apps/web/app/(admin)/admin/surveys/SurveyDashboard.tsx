"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, type SurveyResults, type SurveyRow } from "@/lib/api";

export function SurveyDashboard({ token, initial }: { token: string; initial: SurveyRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, SurveyResults>>({});
  const [creating, setCreating] = useState(false);

  async function openResults(sid: number) {
    if (open === sid) { setOpen(null); return; }
    setOpen(sid);
    if (!results[sid]) {
      const r = await api<SurveyResults>(`/api/surveys/${sid}/results`, { token });
      setResults((s) => ({ ...s, [sid]: r }));
    }
  }

  async function close(sid: number) {
    if (!confirm("Close this survey to new responses?")) return;
    await api(`/api/admin/surveys/${sid}/close`, { method: "POST", token });
    setRows((rs) => rs.filter((r) => r.id !== sid));
  }

  return (
    <>
      {!creating && (
        <Button onClick={() => setCreating(true)} style={{ marginBottom: "1rem" }}>
          New survey
        </Button>
      )}
      {creating && <NewSurveyForm token={token} onCreated={(s) => { setRows((rs) => [s, ...rs]); setCreating(false); }} onCancel={() => setCreating(false)} />}

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No open surveys.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((s) => (
            <li key={s.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{s.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {s.kind} · {s.response_count} responses
                      {s.closes_at && ` · closes ${new Date(s.closes_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <Button size="sm" variant="secondary" onClick={() => openResults(s.id)}>
                      {open === s.id ? "Hide results" : "Results"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => close(s.id)}>Close</Button>
                  </div>
                </div>
                {open === s.id && results[s.id] && (
                  <ResultsView survey={s} results={results[s.id]} />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ResultsView({ survey, results }: { survey: SurveyRow; results: SurveyResults }) {
  return (
    <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
      <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
        <strong>{results.total_responses}</strong> total responses
      </p>
      {survey.questions.map((q) => {
        const tally = results.tallies[String(q.id)] ?? {};
        const total = Object.values(tally).reduce((n, v) => n + v, 0);
        if (total === 0) {
          return (
            <div key={q.id} style={{ marginTop: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>{q.prompt}</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                No responses yet.
              </p>
            </div>
          );
        }
        if (q.kind === "scale" && q.options) {
          // NPS-style histogram
          return (
            <div key={q.id} style={{ marginTop: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>{q.prompt}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, marginTop: "0.375rem", height: 60 }}>
                {q.options.map((opt) => {
                  const v = tally[opt] ?? 0;
                  const h = (v / Math.max(1, total)) * 100;
                  return (
                    <div key={opt} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ width: "100%", height: `${h}%`, background: "var(--brand)", borderRadius: 2,
                                     minHeight: v > 0 ? 4 : 0 }} />
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
              {q.options.length === 11 && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  NPS: {computeNps(tally)}
                </p>
              )}
            </div>
          );
        }
        if (q.kind === "single" && q.options) {
          return (
            <div key={q.id} style={{ marginTop: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>{q.prompt}</p>
              {q.options.map((opt) => {
                const v = tally[opt] ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return (
                  <div key={opt} style={{ marginTop: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span>{opt}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{v} · {pct}%</span>
                    </div>
                    <div style={{ height: 5, background: "var(--surface-muted)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function computeNps(tally: Record<string, number>): string {
  let promoters = 0, detractors = 0, total = 0;
  for (let n = 0; n <= 10; n += 1) {
    const c = tally[String(n)] ?? 0;
    total += c;
    if (n >= 9) promoters += c;
    if (n <= 6) detractors += c;
  }
  if (total === 0) return "–";
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return `${nps >= 0 ? "+" : ""}${nps}`;
}

function NewSurveyForm({ token, onCreated, onCancel }: {
  token: string;
  onCreated: (s: SurveyRow) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("poll");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState("Option A\nOption B\nOption C");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const opts = options.split("\n").map((s) => s.trim()).filter(Boolean);
      const r = await api<{ id: number }>("/api/admin/surveys", {
        method: "POST", token, body: {
          title, kind,
          questions: [{
            prompt, kind: kind === "nps" ? "scale" : "single",
            options: kind === "nps"
              ? ["0","1","2","3","4","5","6","7","8","9","10"]
              : opts,
            required: true,
          }],
        },
      });
      onCreated({
        id: r.id, title, description: null, kind, closes_at: null,
        status: "open", response_count: 0, answered: false,
        questions: [{
          id: 0, position: 1, prompt,
          kind: kind === "nps" ? "scale" : "single",
          options: kind === "nps"
            ? ["0","1","2","3","4","5","6","7","8","9","10"]
            : opts,
          required: true,
        }],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>New survey</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label style={{ fontSize: "0.875rem" }}>
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value)}
            style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                     border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                     background: "var(--surface)", fontFamily: "inherit" }}>
            <option value="poll">Poll (single choice)</option>
            <option value="nps">NPS (0–10 score)</option>
            <option value="consultation">Consultation</option>
          </select>
        </label>
        <Input label="Question prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {kind !== "nps" && (
          <label style={{ fontSize: "0.875rem" }}>
            Options (one per line)
            <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={4}
              style={{ marginTop: "0.25rem", width: "100%", padding: "0.5rem",
                       border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                       fontFamily: "inherit", resize: "vertical" }} />
          </label>
        )}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button onClick={submit} disabled={busy || !title || !prompt}>
            {busy ? "Creating…" : "Create"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
