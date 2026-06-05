import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, type AnimalListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { AdoptionForm } from "./AdoptionForm";

export default async function AnimalDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const { id } = await params;

  let a: AnimalListItem;
  try {
    a = await api<AnimalListItem>(`/api/animals/${id}`, { token });
  } catch {
    redirect("/animals");
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.25rem 1.25rem 6rem" }}>
      <Link href="/animals" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Animals
      </Link>

      <Card style={{ marginTop: "0.75rem", padding: 0, overflow: "hidden" }}>
        <div
          aria-hidden="true"
          style={{
            aspectRatio: "16/9",
            background:
              "linear-gradient(135deg, var(--brand-soft) 0%, var(--gold-soft) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "4rem",
          }}
        >
          {a.species === "dog" ? "🐶" : a.species === "cat" ? "🐱" : "🐾"}
        </div>
        <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.625rem", fontWeight: 700 }}>{a.name}</h1>
          <p style={{ margin: "0.25rem 0 1rem", color: "var(--text-secondary)" }}>
            {a.breed ?? a.species}
            {a.age_years ? ` · ${a.age_years} yrs` : ""}
            {a.sex ? ` · ${a.sex}` : ""}
          </p>

          {a.description && (
            <p style={{ marginTop: 0, lineHeight: 1.6 }}>{a.description}</p>
          )}
          {a.temperament && (
            <p
              style={{
                marginTop: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: "var(--gold-soft)",
                borderRadius: "var(--r-md)",
                fontSize: "0.875rem",
                color: "var(--gold-deep)",
              }}
            >
              {a.temperament}
            </p>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <AdoptionForm animalId={a.id} animalName={a.name} token={token} />
          </div>
        </div>
      </Card>
    </main>
  );
}
