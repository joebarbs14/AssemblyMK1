"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, type ChatCitation } from "@/lib/api";

interface Turn {
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
}

const SUGGESTIONS = [
  "When is my bin night?",
  "Do I need a DA for a pergola?",
  "When are rates due?",
  "Water restrictions?",
];

export function Chat({ token }: { token: string }) {
  const [sessionId] = useState(() => crypto.randomUUID().slice(0, 32));
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setTurns((t) => [...t, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const r = await api<{ answer: string; citations: ChatCitation[] }>("/api/chat", {
        method: "POST", token, body: { session_id: sessionId, question },
      });
      setTurns((t) => [...t, { role: "assistant", text: r.answer, citations: r.citations }]);
    } catch (e) {
      setTurns((t) => [...t, {
        role: "assistant",
        text: e instanceof Error ? `Sorry — ${e.message}` : "Sorry, something went wrong.",
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "60vh",
                    overflowY: "auto", padding: "0 0 0.5rem" }}>
        {turns.length === 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)}
                style={{
                  padding: "0.375rem 0.75rem", borderRadius: "var(--r-full)",
                  background: "var(--surface-muted)", border: "1px solid var(--border)",
                  fontSize: "0.8125rem", fontFamily: "inherit", cursor: "pointer",
                }}>{s}</button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} style={{
            alignSelf: t.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
            padding: "0.625rem 0.875rem",
            background: t.role === "user" ? "var(--brand)" : "var(--surface-muted)",
            color: t.role === "user" ? "var(--brand-fg)" : "var(--text-primary)",
            borderRadius: "var(--r-lg)",
            fontSize: "0.875rem",
            whiteSpace: "pre-wrap",
          }}>
            {t.text}
            {t.citations && t.citations.length > 0 && (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: 2 }}>
                {t.citations.map((c, j) => (
                  <span key={c.id} style={{ fontSize: "0.7rem", opacity: 0.85 }}>
                    [{j + 1}] {c.title}
                    {c.source_url && (
                      <> · <a href={c.source_url} target="_blank" rel="noreferrer"
                        style={{ color: "inherit", textDecoration: "underline" }}>source</a></>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <p style={{ alignSelf: "flex-start", margin: 0, fontSize: "0.875rem",
                       color: "var(--text-secondary)", fontStyle: "italic" }}>thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }}
        style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          style={{
            flex: 1, padding: "0.5rem 0.75rem", fontSize: "0.9375rem",
            border: "1px solid var(--border)", borderRadius: "var(--r-md)",
            fontFamily: "inherit",
          }} />
        <Button type="submit" size="sm" disabled={busy || !input}>Ask</Button>
      </form>
    </Card>
  );
}
