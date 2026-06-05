import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type PetRegistrationRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { PetForm } from "./PetForm";

export default async function PetsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const pets = await api<PetRegistrationRow[]>("/api/pets/mine", { token });

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        My pets
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Register your dog or cat with council. Annual renewal with auto-reminder.
      </p>

      <PetForm token={token} />

      {pets.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {pets.map((p) => (
            <li key={p.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "1.0625rem" }}>{p.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {p.breed ?? p.species} · #{p.registration_number}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      Renewal {new Date(p.valid_until).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {p.annual_fee_cents > 0 && (
                      <p style={{ margin: "2px 0 0", fontSize: "0.875rem", fontWeight: 600 }}>
                        <Money cents={p.annual_fee_cents} />/yr
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
