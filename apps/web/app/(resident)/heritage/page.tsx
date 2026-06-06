import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type HeritageSiteRow } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const KIND_LABEL: Record<string, string> = {
  built: "Built heritage",
  natural: "Natural heritage",
  cultural: "Cultural significance",
  story_place: "Story place",
  walking_trail: "Heritage walk",
};

export default async function HeritagePage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  const rows = await api<HeritageSiteRow[]>("/api/heritage", { token });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Heritage &amp; Country
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
        Heritage sites, story places, and First Nations placenames — published with consent from
        Traditional Owners.
      </p>
      <Card style={{ marginBottom: "1.25rem", background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          We acknowledge the Wiradjuri people as the Traditional Owners of the land on which we
          live and work. We pay our respects to Elders past, present and emerging.
        </p>
      </Card>

      {rows.length === 0 ? (
        <Card><p style={{ margin: 0, color: "var(--text-secondary)" }}>No heritage sites listed yet.</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((h) => (
            <li key={h.id}>
              <Card>
                <p style={{
                  margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text-secondary)",
                }}>{KIND_LABEL[h.kind] ?? h.kind}</p>
                <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, margin: "0.25rem 0 0" }}>{h.name}</h2>
                {h.traditional_name && (
                  <p style={{ margin: "0.25rem 0 0", fontStyle: "italic", fontWeight: 500, color: "var(--brand)" }}>
                    {h.traditional_name}
                    {h.language_group && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {" "}({h.language_group})
                      </span>
                    )}
                  </p>
                )}
                {h.country && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {h.country} Country
                  </p>
                )}
                {h.address && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {h.address}
                  </p>
                )}
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>{h.significance}</p>
                {h.audio_url && (
                  <audio controls src={h.audio_url} style={{ marginTop: "0.5rem", width: "100%" }}>
                    Oral history audio
                  </audio>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
