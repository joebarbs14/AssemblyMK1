import Link from "next/link";
import * as React from "react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-muted)",
      }}
    >
      <header
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "var(--text-primary)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 28,
              height: 28,
              borderRadius: "var(--r-md)",
              background: "var(--brand)",
            }}
          />
          <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>Assembly</span>
        </Link>
      </header>

      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            <h1
              style={{
                fontSize: "1.625rem",
                margin: "0 0 0.5rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Local government, in your pocket.
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              Report issues. Track responses. Pay rates. All in one place.
            </p>
          </div>
          {children}
        </div>
      </section>

      <footer
        style={{
          padding: "1rem 1.5rem 2rem",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        Australian Privacy Principles compliant · WCAG 2.2 AA
      </footer>
    </main>
  );
}
