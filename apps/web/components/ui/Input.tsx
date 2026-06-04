import * as React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  errorText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, errorText, id, style, ...rest },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const describedBy = hint || errorText ? `${inputId}-desc` : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
        style={{
          padding: "0.625rem 0.75rem",
          fontSize: "1rem",
          fontFamily: "inherit",
          background: "var(--surface)",
          color: "var(--text-primary)",
          border: `1px solid ${errorText ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "var(--r-md)",
          outline: "none",
          minHeight: 44,
          ...style,
        }}
      />
      {(hint || errorText) && (
        <p
          id={describedBy}
          role={errorText ? "alert" : undefined}
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            color: errorText ? "var(--danger)" : "var(--text-secondary)",
          }}
        >
          {errorText ?? hint}
        </p>
      )}
    </div>
  );
});
