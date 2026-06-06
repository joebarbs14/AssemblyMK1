"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function PetForm({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [species, setSpecies] = React.useState<"dog" | "cat" | "other">("dog");
  const [name, setName] = React.useState("");
  const [breed, setBreed] = React.useState("");
  const [desexed, setDesexed] = React.useState(false);
  const [microchip, setMicrochip] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await fetch(`${API_BASE}/api/pets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          species, name, breed: breed || null,
          desexed, microchip_id: microchip || null,
        }),
      });
      router.refresh();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Register a pet</Button>;

  return (
    <Card>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Species</label>
          <select value={species} onChange={(e) => setSpecies(e.target.value as typeof species)} style={{
            padding: "0.625rem 0.75rem", minHeight: 44, borderRadius: "var(--r-md)",
            border: "1px solid var(--border)", background: "var(--surface)",
          }}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
        <Input label="Microchip ID" value={microchip} onChange={(e) => setMicrochip(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9375rem" }}>
          <input type="checkbox" checked={desexed} onChange={(e) => setDesexed(e.target.checked)} />
          Desexed (lower registration fee)
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" disabled={pending}>{pending ? "Registering…" : "Register"}</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
