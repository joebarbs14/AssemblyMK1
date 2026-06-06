import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type TreeRow } from "@/lib/api";

interface PageProps { params: Promise<{ qr: string }> }

export default async function TreeQrPage({ params }: PageProps) {
  const { qr } = await params;
  let tree: TreeRow;
  try {
    tree = await api<TreeRow>(`/api/public/trees/${encodeURIComponent(qr)}`);
  } catch {
    notFound();
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>

      <Card style={{ marginTop: "1rem" }}>
        <p style={{
          margin: 0, fontSize: "0.7rem", textTransform: "uppercase",
          letterSpacing: "0.04em", color: "var(--text-secondary)", fontWeight: 600,
        }}>Tree</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.25rem 0" }}>{tree.species_common}</h1>
        {tree.species_botanical && (
          <p style={{ margin: "0 0 0.75rem", fontStyle: "italic", color: "var(--text-secondary)" }}>
            {tree.species_botanical}
          </p>
        )}
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.25rem 0.75rem", fontSize: "0.875rem" }}>
          {tree.planted_on && (<><dt style={{ color: "var(--text-secondary)" }}>Planted</dt><dd style={{ margin: 0 }}>{new Date(tree.planted_on).toLocaleDateString()}</dd></>)}
          {tree.canopy_m && (<><dt style={{ color: "var(--text-secondary)" }}>Canopy</dt><dd style={{ margin: 0 }}>{tree.canopy_m.toFixed(1)} m</dd></>)}
          {tree.height_m && (<><dt style={{ color: "var(--text-secondary)" }}>Height</dt><dd style={{ margin: 0 }}>{tree.height_m.toFixed(1)} m</dd></>)}
          <dt style={{ color: "var(--text-secondary)" }}>Status</dt><dd style={{ margin: 0, textTransform: "capitalize" }}>{tree.status}</dd>
        </dl>
      </Card>

      <Card style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Look after this tree</h2>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Sign in to adopt — name it, log waterings, see it through summer.
        </p>
        <Link href="/trees" style={{
          display: "inline-block", padding: "0.625rem 1rem",
          background: "var(--brand)", color: "var(--brand-fg)",
          borderRadius: "var(--r-md)", fontWeight: 600, textDecoration: "none", fontSize: "0.9375rem",
        }}>Open the register</Link>
      </Card>

      <Card style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Something wrong?</h2>
        <Link
          href={`/reports/new?title=${encodeURIComponent("Tree issue: " + tree.species_common)}`}
          style={{
            display: "inline-block", padding: "0.625rem 1rem",
            background: "var(--surface-muted)", color: "var(--text-primary)",
            borderRadius: "var(--r-md)", fontWeight: 600, textDecoration: "none", fontSize: "0.9375rem",
          }}
        >Report fault</Link>
      </Card>
    </main>
  );
}
