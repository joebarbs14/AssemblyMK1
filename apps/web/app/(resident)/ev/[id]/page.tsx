import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type EvChargerRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { EvBooker } from "./EvBooker";

interface PageProps { params: Promise<{ id: string }> }

export default async function EvBookPage({ params }: PageProps) {
  const { id } = await params;
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const all = await api<EvChargerRow[]>("/api/ev/chargers", { token });
  const charger = all.find((c) => c.id === Number(id));
  if (!charger) notFound();

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/ev" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← EV chargers</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>{charger.name}</h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem", fontSize: "0.875rem" }}>
        {charger.address} · {charger.kw} kW · {charger.plug_type.toUpperCase()}
      </p>

      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Reserve a slot</h2>
        <EvBooker token={token} chargerId={charger.id} />
      </Card>
    </main>
  );
}
