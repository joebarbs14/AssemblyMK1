import * as React from "react";

interface Props {
  /** Pixel height. Width auto-scales. */
  size?: number;
  /** "stacked" = mark + wordmark + tagline. "mark" = just the A.
   *  "horizontal" = mark + wordmark inline. */
  variant?: "stacked" | "mark" | "horizontal";
  /** Light theme uses navy wordmark; dark theme uses white. */
  theme?: "light" | "dark";
  /** Optional override for tagline visibility on stacked. */
  showTagline?: boolean;
  className?: string;
}

/**
 * Assembly logo. Reproduces the brand mark inline so it's crisp at
 * any DPR and themable for light/dark surfaces.
 */
export function AssemblyLogo({
  size = 64,
  variant = "mark",
  theme = "light",
  showTagline = true,
  className,
}: Props) {
  const wordmarkColor = theme === "dark" ? "#FFFFFF" : "#1B2A3A";
  const taglineColor = theme === "dark" ? "#7FD6D2" : "#3FA8A4";

  if (variant === "mark") {
    return <Mark size={size} className={className} />;
  }

  if (variant === "horizontal") {
    return (
      <span className={className} style={{
        display: "inline-flex", alignItems: "center", gap: size * 0.18,
      }}>
        <Mark size={size} />
        <span style={{
          fontFamily: "inherit", fontWeight: 700, letterSpacing: "-0.02em",
          fontSize: size * 0.42, color: wordmarkColor, lineHeight: 1,
        }}>Assembly</span>
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}
    >
      <Mark size={size} />
      <span style={{
        marginTop: size * 0.16,
        fontFamily: "inherit", fontWeight: 700,
        letterSpacing: "-0.02em", lineHeight: 1,
        fontSize: size * 0.42, color: wordmarkColor,
      }}>Assembly</span>
      {showTagline && (
        <span style={{
          marginTop: size * 0.06,
          fontFamily: "inherit", fontWeight: 600,
          fontSize: size * 0.135, letterSpacing: "0.005em",
          color: taglineColor,
        }}>
          One Platform. Every Service.
        </span>
      )}
    </span>
  );
}

function Mark({ size, className }: { size: number; className?: string }) {
  // Brand gradient: teal at the apex → navy at the base.
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Assembly"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#5DCFC8" />
          <stop offset="55%" stopColor="#3D8FAF" />
          <stop offset="100%" stopColor="#1B2A3A" />
        </linearGradient>
      </defs>

      {/*
        The "A" silhouette: solid filled tetrahedron-ish glyph with the
        Southern Cross knocked out of the upper triangle.
        Outer path drawn clockwise; star paths drawn counter-clockwise
        with even-odd fill so they cut through the fill.
      */}
      <path
        fill={`url(#${id}-grad)`}
        fillRule="evenodd"
        d="
          M50 6
          L94 92
          L72 92
          L62 71
          L38 71
          L28 92
          L6 92
          Z
          M50 32
          L42.5 53
          L57.5 53
          Z

          /* Star: top-center (4-point) */
          M50 35
          l1.7 4.2
          l4.2 1.7
          l-4.2 1.7
          l-1.7 4.2
          l-1.7 -4.2
          l-4.2 -1.7
          l4.2 -1.7
          Z

          /* Star: right of crossbar */
          M62 52
          l1.4 3.4
          l3.4 1.4
          l-3.4 1.4
          l-1.4 3.4
          l-1.4 -3.4
          l-3.4 -1.4
          l3.4 -1.4
          Z

          /* Star: left of crossbar */
          M38 52
          l1.4 3.4
          l3.4 1.4
          l-3.4 1.4
          l-1.4 3.4
          l-1.4 -3.4
          l-3.4 -1.4
          l3.4 -1.4
          Z

          /* Star: bottom-center under crossbar */
          M50 62
          l1.4 3.4
          l3.4 1.4
          l-3.4 1.4
          l-1.4 3.4
          l-1.4 -3.4
          l-3.4 -1.4
          l3.4 -1.4
          Z

          /* Star: small Epsilon, slightly right */
          M56 44
          l0.9 2.2
          l2.2 0.9
          l-2.2 0.9
          l-0.9 2.2
          l-0.9 -2.2
          l-2.2 -0.9
          l2.2 -0.9
          Z
        "
      />
    </svg>
  );
}
