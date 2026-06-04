import { Card } from "@/components/ui/Card";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--surface-muted)",
      }}
    >
      <Card style={{ maxWidth: 420 }}>
        <h1 style={{ marginTop: 0, fontSize: "1.25rem" }}>You're offline</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Drafts you save will sync as soon as you're back online. Open reports
          you've already viewed will load from cache.
        </p>
      </Card>
    </main>
  );
}
