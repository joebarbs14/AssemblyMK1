import { API_BASE, DEFAULT_COUNCIL_SLUG } from "./env";

export type ApiError = { status: number; detail: string };

interface Options {
  method?: string;
  body?: unknown;
  token?: string;
  council?: string;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, token, council } = opts;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Council-Slug": council ?? DEFAULT_COUNCIL_SLUG,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      // body wasn't JSON; keep statusText
    }
    const err: ApiError = { status: res.status, detail };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Me {
  id: number;
  email: string;
  name: string | null;
  role: "resident" | "staff" | "admin";
  council: { id: number; slug: string; name: string; brand_color: string };
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// --- Reports ---

export interface Category {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  sla_hours: number;
  requires_photo: boolean;
}

export type ReportStatus =
  | "new"
  | "triaging"
  | "assigned"
  | "in_progress"
  | "awaiting_resident"
  | "resolved"
  | "closed"
  | "duplicate"
  | "rejected";

export interface ReportListItem {
  id: number;
  title: string;
  status: ReportStatus;
  priority: string;
  category_id: number;
  category_label: string;
  created_at: string;
  sla_due_at: string | null;
  assignee_name: string | null;
}

export interface ReportEvent {
  id: number;
  kind: string;
  actor_user_id: number | null;
  actor_name: string | null;
  body: string | null;
  internal: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface QueueSummary {
  total_open: number;
  by_status: Record<string, number>;
  by_team: Record<string, number>;
  sla_breached: number;
  sla_at_risk: number;
  mine: number;
}

export interface ReportDetail {
  id: number;
  title: string;
  description: string;
  status: ReportStatus;
  priority: string;
  category_id: number;
  category_label: string;
  reporter_user_id: number;
  reporter_name: string | null;
  assignee_user_id: number | null;
  assignee_name: string | null;
  team_id: number | null;
  team_name: string | null;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
  created_at: string;
  sla_due_at: string | null;
  resolved_at: string | null;
  attachments: { id: number; kind: string; r2_key: string; mime: string | null; created_at: string }[];
  custom_fields: Record<string, unknown> | null;
}
