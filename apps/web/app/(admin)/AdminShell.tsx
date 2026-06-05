import Link from "next/link";
import * as React from "react";

import type { Me } from "@/lib/api";

type Tab = "users" | "categories" | "audit" | "webhooks";

export function AdminShell({
  me,
  active,
  children,
}: {
  me: Me;
  active: Tab;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        minHeight: "100dvh",
        background: "var(--surface-muted)",
      }}
    >
      <aside
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "1.25rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <p
          style={{
            margin: "0 0.5rem 1rem",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--gold-deep)",
            fontWeight: 700,
          }}
        >
          {me.council.name} · Admin
        </p>
        <Item href="/admin/users" label="Users" active={active === "users"} />
        <Item href="/admin/categories" label="Report categories" active={active === "categories"} />
        <Item href="/admin/audit" label="Audit log" active={active === "audit"} />
        <Item href="/admin/webhooks" label="Webhooks" active={active === "webhooks"} />
        <div style={{ flex: 1 }} />
        <Item href="/staff" label="← Back to staff" active={false} />
      </aside>

      <main style={{ padding: "1.25rem 1.5rem 4rem", maxWidth: 1100, width: "100%" }}>
        {children}
      </main>
    </div>
  );
}

function Item({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: "var(--r-md)",
        fontSize: "0.9375rem",
        color: active ? "var(--brand-fg)" : "var(--text-primary)",
        background: active ? "var(--brand)" : "transparent",
        textDecoration: "none",
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
    </Link>
  );
}
