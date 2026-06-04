import * as React from "react";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "1.5rem",
        boxShadow: "var(--e1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
