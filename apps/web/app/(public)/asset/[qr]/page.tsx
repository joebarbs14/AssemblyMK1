import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api, type AssetRow } from "@/lib/api";

interface PageProps {
  params: Promise<{ qr: string }>;
}

export default async function AssetQrPage({ params }: PageProps) {
  const { qr } = await params;
  let asset: AssetRow;
  try {
    asset = await api<AssetRow>(`/api/public/assets/${encodeURIComponent(qr)}`);
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
        }}>{asset.kind.replace("_", " ")}</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.25rem 0 0.5rem" }}>
          {asset.label}
        </h1>
        {asset.address_text && (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {asset.address_text}
          </p>
        )}
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          Status: <strong style={{ textTransform: "capitalize" }}>{asset.status}</strong>
          {asset.last_inspected_at && (
            <> · last inspected {new Date(asset.last_inspected_at).toLocaleDateString()}</>
          )}
        </p>
      </Card>

      <Card style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600 }}>Something wrong?</h2>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Report a fault — broken, damaged, unsafe. We&apos;ll know exactly which asset.
        </p>
        <Link
          href={`/reports/new?asset=${encodeURIComponent(asset.qr_payload)}&title=${encodeURIComponent("Fault at " + asset.label)}`}
          style={{
            display: "inline-block",
            padding: "0.625rem 1rem",
            background: "var(--brand)",
            color: "var(--brand-fg)",
            borderRadius: "var(--r-md)",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "0.9375rem",
          }}
        >
          Report this asset
        </Link>
      </Card>
    </main>
  );
}
