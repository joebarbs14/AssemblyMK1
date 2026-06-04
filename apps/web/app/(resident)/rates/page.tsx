import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { api, type PropertyListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { SeedDemoButton } from "./SeedDemoButton";

export default async function RatesListPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let properties: PropertyListItem[] = [];
  try {
    properties = await api<PropertyListItem[]>("/api/rates/properties", { token });
  } catch {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1.25rem" }}>Rates</h1>

      {properties.length === 0 ? (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>No properties yet</h2>
          <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            Council will link your properties to your account once verified. In the meantime, you can
            load a demo property to explore the rates view.
          </p>
          <SeedDemoButton />
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {properties.map((p) => (
            <li key={p.id}>
              <Link href={`/rates/${p.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <Card style={{ padding: "1rem 1.25rem" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {p.property_type} property
                  </p>
                  <h2 style={{ margin: "0.25rem 0", fontSize: "1.0625rem", fontWeight: 600 }}>{p.address}</h2>
                  {(p.suburb || p.postcode) && (
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {[p.suburb, p.postcode].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {p.account && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {p.account.balance_cents > 0 ? "Balance" : "Up to date"}
                      </span>
                      <span style={{ color: p.overdue ? "var(--danger)" : "var(--text-primary)" }}>
                        <Money cents={p.account.balance_cents} emphasis />
                      </span>
                    </div>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
