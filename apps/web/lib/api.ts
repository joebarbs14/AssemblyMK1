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
  council: {
    id: number;
    slug: string;
    name: string;
    brand_color: string;
    logo_url: string | null;
    shire_name: string | null;
  };
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

// --- Rates ---

export interface AccountSummary {
  id: number;
  account_number: string;
  balance_cents: number;
  next_due_date: string | null;
  ebilling_enabled: boolean;
}

export interface PropertyListItem {
  id: number;
  address: string;
  suburb: string | null;
  postcode: string | null;
  property_type: string;
  account: AccountSummary | null;
  overdue: boolean;
}

export interface Valuation {
  year: number;
  land_value_cents: number;
  capital_value_cents: number;
}

export interface RateChargeRow {
  period_start: string;
  period_end: string;
  category: string;
  amount_cents: number;
  note: string | null;
}

export interface ConcessionRow {
  type: string;
  status: string;
  annual_value_cents: number | null;
  link_apply: string | null;
}

export interface OverlayRow {
  kind: string;
  source: string | null;
  note: string | null;
}

export interface WasteEntitlementRow {
  bin_size_l: number | null;
  extra_bins: number;
  collection_day: string | null;
  notes: string | null;
}

export interface BillingSettingRow {
  direct_debit_active: boolean;
  ebill_active: boolean;
  update_payment_link: string | null;
}

export interface PropertyDetail {
  id: number;
  address: string;
  suburb: string | null;
  postcode: string | null;
  property_type: string;
  lat: number | null;
  lng: number | null;
  zone: string | null;
  land_size_sqm: number | null;
  account: AccountSummary | null;
  valuations: Valuation[];
  rate_charges: RateChargeRow[];
  concessions: ConcessionRow[];
  overlays: OverlayRow[];
  waste_entitlement: WasteEntitlementRow | null;
  billing_setting: BillingSettingRow | null;
  council_contact: { council_name: string | null; logo_url: string | null };
}

export interface InvoiceOut {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  amount_cents: number;
  status: string;
  pdf_url: string | null;
  line_items: { label: string; amount_cents: number }[] | null;
}

export interface BpayOut {
  biller_code: string;
  crn: string;
  deep_link: string;
}

export interface PaypalOrder {
  order_id: string;
  approve_url: string;
  mock: boolean;
  invoice_id: number;
  amount_cents: number;
}

export interface PaymentRecord {
  id: number;
  amount_cents: number;
  currency: string;
  provider: "paypal" | "bpay" | "manual";
  status: "pending" | "succeeded" | "failed" | "refunded";
  paid_at: string | null;
  invoice_id: number | null;
  crn: string | null;
  created_at: string;
}

// --- Reports detail (existing) ---

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
