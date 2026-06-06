import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type PermitRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function PermitsPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const permits = await api<PermitRow[]>("/api/permits/mine", { token });

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        My permits
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        Resident parking, visitor passes, beach permits, trade-day passes.
        Show the QR to council rangers.
      </p>

      {permits.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            No active permits. Application flow lands in the next release.
          </p>
        </Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {permits.map((p) => (
            <li key={p.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", textTransform: "capitalize" }}>
                      {p.kind.replace("_", " ")}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }} className="tnum">
                      #{p.permit_number}
                      {p.plate && ` · ${p.plate}`}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      {new Date(p.valid_from).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – {new Date(p.valid_until).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(p.qr_payload)}`}
                    style={{ display: "block" }}
                    aria-label="View permit QR"
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(p.qr_payload)}`}
                      alt="QR"
                      width={80}
                      height={80}
                      style={{ display: "block", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}
                    />
                  </a>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
