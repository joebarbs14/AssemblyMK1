import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type AnimalListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function AnimalsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let animals: AnimalListItem[] = [];
  try {
    animals = await api<AnimalListItem[]>("/api/animals", { token });
  } catch {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Animals for adoption
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Furry friends waiting for a home. Tap to see more.
      </p>

      {animals.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>None listed right now.</p>
        </Card>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {animals.map((a) => (
            <li key={a.id}>
              <Link
                href={`/animals/${a.id}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div
                    aria-hidden="true"
                    style={{
                      aspectRatio: "4/3",
                      background:
                        "linear-gradient(135deg, var(--brand-soft) 0%, var(--gold-soft) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2.25rem",
                    }}
                  >
                    {a.species === "dog" ? "🐶" : a.species === "cat" ? "🐱" : "🐾"}
                  </div>
                  <div style={{ padding: "0.875rem 1rem 1rem" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "1.0625rem" }}>{a.name}</p>
                    <p
                      style={{
                        margin: "0.125rem 0 0",
                        fontSize: "0.8125rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {a.breed ?? a.species}
                      {a.age_years ? ` · ${a.age_years} yrs` : ""}
                      {a.sex ? ` · ${a.sex}` : ""}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
