import Link from "next/link";

import { Card } from "@/components/ui/Card";

const COPY: Record<string, { title: string; milestone: string; description: string }> = {
  water: {
    title: "Water",
    milestone: "M11",
    description:
      "Consumption charts per quarter, allocation vs used, bill due dates, and push reminders for high usage.",
  },
  waste: {
    title: "Waste & bins",
    milestone: "M12",
    description:
      "When's your bin night? Per-address collection schedule, missed-collection shortcut, route changes on holidays.",
  },
  development: {
    title: "Development applications",
    milestone: "M10",
    description:
      "Submit and track DAs, see neighbours' nearby applications, public exhibition timer, document attachments.",
  },
  community: {
    title: "Community news",
    milestone: "M7",
    description:
      "Council announcements targeted to your ward, public consultations, broadcast push notifications.",
  },
  animals: {
    title: "Animals",
    milestone: "M9",
    description:
      "Pet registration, adoption listings with photos, lost & found, apply-to-adopt as a typed report.",
  },
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const sp = await searchParams;
  const m = sp.module && sp.module in COPY ? COPY[sp.module] : null;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Home
      </Link>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        {m ? m.title : "Coming soon"}
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem" }}>
        {m
          ? `Building in milestone ${m.milestone}.`
          : "This area is still under construction."}
      </p>

      <Card>
        <p style={{ margin: 0 }}>
          {m?.description ??
            "We're working through the legacy services in v1.x. Check back soon."}
        </p>
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.5rem" }}>
          <Link
            href="/"
            style={{
              padding: "0.5rem 0.875rem",
              background: "var(--brand)",
              color: "var(--brand-fg)",
              borderRadius: "var(--r-md)",
              textDecoration: "none",
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            Back to home
          </Link>
        </div>
      </Card>
    </main>
  );
}
