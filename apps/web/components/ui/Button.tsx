import clsx from "clsx";
import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const base: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  border: "1px solid transparent",
  borderRadius: "var(--r-md)",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background var(--d-std) var(--ease-in), border-color var(--d-std) var(--ease-in)",
  minHeight: 44,
  fontFamily: "inherit",
};

const sizes: Record<Size, React.CSSProperties> = {
  sm: { padding: "0.375rem 0.75rem", fontSize: "0.875rem", minHeight: 36 },
  md: { padding: "0.625rem 1rem", fontSize: "0.9375rem" },
  lg: { padding: "0.875rem 1.25rem", fontSize: "1rem" },
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--brand)", color: "var(--brand-fg)" },
  secondary: { background: "var(--surface)", color: "var(--text-primary)", borderColor: "var(--border)" },
  ghost: { background: "transparent", color: "var(--text-primary)" },
  danger: { background: "var(--danger)", color: "#fff" },
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  disabled,
  style,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={clsx(className)}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    />
  );
}
