"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

interface CemeteryRow {
  id: number;
  cemetery_name: string;
  deceased_full_name: string;
  date_of_death: string | null;
  date_of_birth: string | null;
  section: string | null;
  row: string | null;
  plot: string | null;
}

export default function CemeteryPage() {
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<CemeteryRow[] | null>(null);
  const [pending, setPending] = React.useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/public/cemetery/${DEFAULT_COUNCIL_SLUG}/search?q=${encodeURIComponent(q)}`,
      );
      if (r.ok) setRows((await r.json()) as CemeteryRow[]);
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Cemetery records
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Public search for plot details across council cemeteries.
      </p>
      <Card style={{ marginBottom: "1rem" }}>
        <form onSubmit={search} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Name or cemetery"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <Button type="submit" disabled={pending}>{pending ? "…" : "Search"}</Button>
        </form>
      </Card>

      {rows !== null && (
        rows.length === 0 ? (
          <Card><p style={{ color: "var(--text-secondary)", margin: 0 }}>No matches.</p></Card>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rows.map((r) => (
              <li key={r.id}>
                <Card>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{r.deceased_full_name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {r.cemetery_name}
                    {r.section && ` · Section ${r.section}`}
                    {r.row && `, Row ${r.row}`}
                    {r.plot && `, Plot ${r.plot}`}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-tertiary)" }} className="tnum">
                    {r.date_of_birth && `b. ${new Date(r.date_of_birth).toLocaleDateString("en-AU")} `}
                    {r.date_of_death && ` d. ${new Date(r.date_of_death).toLocaleDateString("en-AU")}`}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )
      )}
    </main>
  );
}
