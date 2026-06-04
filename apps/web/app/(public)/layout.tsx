import * as React from "react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
      <div style={{ width: "100%", maxWidth: 420 }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Assembly
          </p>
          <h1 style={{ fontSize: "1.75rem", margin: "0.25rem 0 0", fontWeight: 600 }}>
            Local government, in your pocket.
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}
