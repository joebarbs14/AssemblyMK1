"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

export function RollFilter({ defaultQ, defaultOverdue }: {
  defaultQ: string; defaultOverdue: boolean;
}) {
  const [q, setQ] = useState(defaultQ);
  const [overdue, setOverdue] = useState(defaultOverdue);
  const router = useRouter();

  function apply() {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (overdue) p.set("overdue", "true");
    router.push(`/staff/rates${p.toString() ? `?${p.toString()}` : ""}`);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply(); }}
      style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search address…"
        style={{
          flex: 1, padding: "0.5rem 0.75rem", fontSize: "0.875rem",
          border: "1px solid var(--border)", borderRadius: "var(--r-md)",
          fontFamily: "inherit",
        }} />
      <label style={{ display: "flex", gap: "0.375rem", alignItems: "center", fontSize: "0.875rem" }}>
        <input type="checkbox" checked={overdue}
          onChange={(e) => setOverdue(e.target.checked)} />
        Overdue only
      </label>
      <Button type="submit" size="sm">Filter</Button>
    </form>
  );
}
