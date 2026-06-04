const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function Money({
  cents,
  className,
  emphasis = false,
}: {
  cents: number;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <span
      className={`tnum ${className ?? ""}`}
      style={emphasis ? { fontWeight: 600, fontSize: "1.5rem", letterSpacing: "-0.01em" } : undefined}
    >
      {AUD.format(cents / 100)}
    </span>
  );
}

export function formatMoney(cents: number): string {
  return AUD.format(cents / 100);
}
