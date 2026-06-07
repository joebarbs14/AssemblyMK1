import * as React from "react";

/**
 * Passthrough wrapper. Each public page (/login, /signup, /portal,
 * /magic-link, /open-data, /tree, /asset) owns its full canvas so the
 * on-mobile fold isn't wasted on duplicate branding.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
