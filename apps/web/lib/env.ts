export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE ??
  "http://localhost:8000";

// Default tenant slug for dev when no subdomain is in play.
export const DEFAULT_COUNCIL_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_COUNCIL_SLUG ??
  process.env.DEFAULT_COUNCIL_SLUG ??
  "leeton";

export const SESSION_COOKIE = "assembly_session";
