"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { api, type SurveyRow } from "@/lib/api";

export function SurveyAnswerer({ token, survey }: { token: string; survey: SurveyRow }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [done, setDone] = useState(survey.answered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOne(qid: number, value: string | string[]) {
    setAnswers((a) => ({ ...a, [String(qid)]: value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/surveys/${survey.id}/respond`, {
        method: "POST", token, body: { answers },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p style={{ margin: 0, color: "#047857", fontWeight: 600, fontSize: "0.875rem" }}>
      ✓ Thanks — your response is recorded.
    </p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {survey.questions.map((q) => (
        <div key={q.id}>
          <p style={{ margin: "0 0 0.375rem", fontSize: "0.875rem", fontWeight: 600 }}>
            {q.prompt}{q.required && <span style={{ color: "var(--danger)" }}> *</span>}
          </p>
          {q.kind === "single" && q.options && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {q.options.map((opt) => (
                <label key={opt} style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <input type="radio" name={`q${q.id}`} value={opt}
                    checked={answers[String(q.id)] === opt}
                    onChange={() => setOne(q.id, opt)} />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.kind === "scale" && q.options && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {q.options.map((opt) => (
                <button key={opt} type="button" onClick={() => setOne(q.id, opt)}
                  style={{
                    minWidth: 36, padding: "0.375rem 0.5rem", fontWeight: 600,
                    borderRadius: "var(--r-md)", border: "1px solid var(--border)",
                    background: answers[String(q.id)] === opt ? "var(--brand)" : "var(--surface)",
                    color: answers[String(q.id)] === opt ? "var(--brand-fg)" : "var(--text-primary)",
                    fontFamily: "inherit", cursor: "pointer", fontSize: "0.875rem",
                  }}>{opt}</button>
              ))}
            </div>
          )}
          {(q.kind === "short_text" || q.kind === "long_text") && (
            <textarea rows={q.kind === "long_text" ? 3 : 1}
              value={(answers[String(q.id)] as string) ?? ""}
              onChange={(e) => setOne(q.id, e.target.value)}
              style={{
                width: "100%", padding: "0.5rem",
                border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                fontFamily: "inherit", resize: "vertical",
              }} />
          )}
        </div>
      ))}
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8125rem" }}>{error}</p>}
      <Button size="sm" onClick={submit} disabled={busy}>
        {busy ? "Submitting…" : "Submit"}
      </Button>
    </div>
  );
}
