"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LibrarySearch({ defaultQuery }: { defaultQuery: string }) {
  const [q, setQ] = useState(defaultQuery);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q ? `/library?q=${encodeURIComponent(q)}` : "/library");
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem" }}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or author…" style={{ flex: 1 }} />
      <Button type="submit">Search</Button>
    </form>
  );
}
