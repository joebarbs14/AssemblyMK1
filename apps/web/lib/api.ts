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

// --- Announcements ---

export interface Announcement {
  id: number;
  title: string;
  body_markdown: string;
  audience: string;
  ward_id: number | null;
  category_id: number | null;
  status: "draft" | "scheduled" | "published" | "archived";
  publish_at: string | null;
  expires_at: string | null;
  author_name: string | null;
  created_at: string;
}

// --- Admin ---

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: "resident" | "staff" | "admin";
  status: "invited" | "active" | "disabled";
}

export interface AdminCategory {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  sla_hours: number;
  requires_photo: boolean;
  is_active: boolean;
}

export interface AuditEntry {
  id: number;
  actor_user_id: number | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  created_at: string;
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

// --- v1.x modules ---

export interface AnimalListItem {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age_years: number | null;
  temperament: string | null;
  status: string;
  photo_url: string | null;
  description: string | null;
}

export interface DARow {
  id: number;
  da_number: string;
  application_type: string;
  description: string;
  estimated_cost_cents: number | null;
  status: string;
  submission_date: string;
  decision_date: string | null;
  exhibition_ends_at: string | null;
}

export interface WaterRow {
  quarter_start: string;
  quarter_end: string;
  consumed_litres: number;
  allocated_litres: number | null;
  amount_owing_cents: number;
  bill_due_date: string | null;
}

export interface WasteRow {
  id: number;
  name: string;
  collection_type: string;
  collection_day: string;
  frequency: string;
  next_collection: string | null;
  notes: string | null;
}

export interface MyWasteRow {
  property_id: number;
  property_address: string;
  route: WasteRow | null;
}

// --- v2 ideas ---

export interface MapReportRow {
  id: number;
  title: string;
  category_label: string;
  status: string;
  lat: number;
  lng: number;
}

export interface MeetingAgendaItemRow {
  id: number;
  position: number;
  title: string;
  description: string | null;
  outcome: string | null;
  votes_for: number | null;
  votes_against: number | null;
  votes_abstain: number | null;
}

export interface MeetingRow {
  id: number;
  title: string;
  starts_at: string;
  duration_minutes: number;
  location: string | null;
  agenda_url: string | null;
  minutes_url: string | null;
  livestream_url: string | null;
  status: string;
  items: MeetingAgendaItemRow[];
}

export interface CommunityPostRow {
  id: number;
  kind: string;
  title: string;
  body_markdown: string;
  event_at: string | null;
  location_text: string | null;
  author_name: string | null;
  status: string;
  created_at: string;
}

export interface ClimateMetricRow {
  key: string;
  label: string;
  unit: string;
  value: number;
  target: number | null;
  target_year: number | null;
  period_end: string;
}

export interface BinLookupResult {
  matched_address: string | null;
  route_name: string | null;
  collection_day: string | null;
  frequency: string | null;
  next_collection: string | null;
  bin_colours_tomorrow: string[];
}

export interface PetRegistrationRow {
  id: number;
  species: string;
  name: string;
  breed: string | null;
  registration_number: string;
  valid_until: string;
  annual_fee_cents: number;
  status: string;
}

export interface PermitRow {
  id: number;
  kind: string;
  permit_number: string;
  plate: string | null;
  holder_name: string;
  valid_from: string;
  valid_until: string;
  qr_payload: string;
  status: string;
}

export interface BudgetSliceRow {
  category: string;
  label: string;
  expense_cents: number;
  prior_year_expense_cents: number | null;
}

export interface BudgetData {
  fiscal_year: number;
  total_expense_cents: number;
  total_revenue_cents: number;
  by_category: BudgetSliceRow[];
}

export interface CapitalProjectRow {
  id: number;
  title: string;
  category: string | null;
  budget_cents: number;
  spent_cents: number;
  status: string;
  progress_pct: number;
  expected_completion: string | null;
}

export interface BusinessRow {
  id: number;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  verified: boolean;
}

export interface CampaignRow {
  id: number;
  title: string;
  blurb: string;
  target_cents: number;
  raised_cents: number;
  progress_pct: number;
  status: string;
  closes_at: string | null;
}

export interface GrantDraftRow {
  id: number;
  title: string;
  grant_name: string | null;
  draft_markdown: string;
  provider: string;
  updated_at: string;
}

export interface ConcessionRow {
  id: number;
  kind: string;
  status: string;
  requested_relief: string | null;
  created_at: string;
}

export interface ProgramRow {
  id: number;
  title: string;
  description: string;
  kind: string;
  capacity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  fee_cents: number;
  bookings_open: boolean;
  spots_remaining: number | null;
}

// --- v3 features ---

export interface GrantOpportunityRow {
  id: number;
  source: string;
  title: string;
  description: string;
  min_amount_cents: number | null;
  max_amount_cents: number | null;
  closes_at: string | null;
  url: string | null;
  eligibility: string | null;
}

export interface AssetRow {
  id: number;
  kind: string;
  label: string;
  qr_payload: string;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
  status: string;
  last_inspected_at: string | null;
}

export interface RoadClosureRow {
  id: number;
  title: string;
  description: string | null;
  lat_from: number;
  lng_from: number;
  lat_to: number | null;
  lng_to: number | null;
  starts_at: string;
  ends_at: string;
  severity: string;
  detour: string | null;
}

export interface VerificationRow {
  provider: string;
  status: string;
  verified_at: string;
}

export interface PreferencesRow {
  language: string;
  high_contrast: boolean;
  dyslexia_font: boolean;
  larger_text: boolean;
  reduced_motion: boolean;
}

export interface LandHireRow {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  capacity: number | null;
  fee_cents_per_unit: number;
  fee_unit: string;
  location: string | null;
  available: boolean;
}

export interface SensorRow {
  id: number;
  kind: string;
  source: string;
  value: number;
  unit: string;
  lat: number;
  lng: number;
  taken_at: string;
}

export interface WebhookRow {
  id: number;
  url: string;
  secret: string;
  event_types: string[];
  active: boolean;
  last_status: number | null;
}

export interface SlaPredictionRow {
  report_id: number;
  title: string;
  category: string;
  status: string;
  sla_due_at: string;
  hours_left: number;
  risk: string;
  rationale: string;
}

export interface DumpingHotspotRow {
  lat: number;
  lng: number;
  incidents: number;
  prediction: string;
}

// --- v4 features ---

export interface DisasterAlertRow {
  id: number;
  kind: string;
  severity: string;
  title: string;
  body: string;
  source: string;
  starts_at: string;
  ends_at: string | null;
}

export interface EvacCentreRow {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number | null;
  facilities: string[] | null;
  status: string;
}

export interface SandbagDepotRow {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  bags_available: number;
  self_serve: boolean;
  hours: string | null;
}

export interface PbProjectRow {
  id: number;
  title: string;
  description: string;
  requested_cents: number;
  image_url: string | null;
  votes_tokens: number;
}

export interface PbRoundRow {
  id: number;
  title: string;
  description: string;
  pool_cents: number;
  tokens_per_voter: number;
  opens_at: string;
  closes_at: string;
  status: string;
  projects: PbProjectRow[];
  tokens_remaining: number;
}

export interface VolunteerOpportunityRow {
  id: number;
  title: string;
  description: string;
  skills_needed: string[];
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: string;
  signed_up: boolean;
  spots_remaining: number | null;
}

export interface TreeRow {
  id: number;
  species_common: string;
  species_botanical: string | null;
  qr_payload: string;
  lat: number;
  lng: number;
  planted_on: string | null;
  canopy_m: number | null;
  height_m: number | null;
  status: string;
}

export interface FoodPremisesRow {
  id: number;
  name: string;
  kind: string;
  address: string;
  lat: number | null;
  lng: number | null;
  licence_no: string;
  status: string;
  latest_grade: string | null;
  latest_score: number | null;
  latest_inspection: string | null;
}

export interface InfringementRow {
  id: number;
  kind: string;
  code: string;
  description: string;
  plate: string | null;
  fee_cents: number;
  issued_at: string;
  status: string;
  lat: number | null;
  lng: number | null;
}

export interface FleetVehicleRow {
  id: number;
  rego: string;
  make: string;
  model: string;
  kind: string;
  fuel: string;
  year: number | null;
  odometer_km: number;
  last_service_on: string | null;
  next_service_due: string | null;
  co2_kg_per_km: number;
  status: string;
  service_overdue: boolean;
}

export interface LibraryItemRow {
  id: number;
  title: string;
  author: string | null;
  isbn: string | null;
  kind: string;
  copies_total: number;
  copies_available: number;
  cover_url: string | null;
  blurb: string | null;
}

export interface TourismRow {
  id: number;
  kind: string;
  name: string;
  blurb: string;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  tags: string[] | null;
}

// --- v5 features ---

export interface ChildcareCentreRow {
  id: number;
  name: string;
  kind: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  age_min_months: number;
  age_max_months: number;
  daily_fee_cents: number;
  vacancies: number;
  rating: string | null;
}

export interface EvChargerRow {
  id: number;
  name: string;
  operator: string;
  plug_type: string;
  kw: number;
  address: string;
  lat: number;
  lng: number;
  cents_per_kwh: number;
  available: boolean;
  bookable: boolean;
}

export interface SwimSiteRow {
  id: number;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  address: string | null;
  facilities: string[] | null;
  status: string;
  latest_grade: string | null;
  latest_temp_c: number | null;
  latest_taken_at: string | null;
}

export interface BurnPermitRow {
  id: number;
  permit_no: string;
  property_address: string;
  burn_kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  conditions: string | null;
}

export interface FireBanRow {
  id: number;
  rating: string;
  declared_at: string;
  ends_at: string;
  source: string;
  note: string | null;
}

export interface LotItemRow {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  image_url: string | null;
  deposit_cents: number;
  max_loan_days: number;
  available: boolean;
}

export interface LostFoundRow {
  id: number;
  kind: string;
  direction: string;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  contact: string | null;
  status: string;
  created_at: string;
  candidate_match_id: number | null;
}

export interface PanelRow {
  id: number;
  title: string;
  description: string;
  question: string;
  target_size: number;
  opens_at: string;
  deliberates_at: string;
  status: string;
  expressed: boolean;
  selected: boolean;
}

export interface FootpathAuditRow {
  id: number;
  lat: number;
  lng: number;
  issue: string;
  grade: string;
  notes: string | null;
  verified: boolean;
  created_at: string;
}

export interface HeritageSiteRow {
  id: number;
  name: string;
  traditional_name: string | null;
  country: string | null;
  language_group: string | null;
  kind: string;
  significance: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  audio_url: string | null;
}

// --- v6 features ---

export interface SurveyQuestionRow {
  id: number;
  position: number;
  prompt: string;
  kind: string;
  options: string[] | null;
  required: boolean;
}

export interface SurveyRow {
  id: number;
  title: string;
  description: string | null;
  kind: string;
  closes_at: string | null;
  status: string;
  response_count: number;
  answered: boolean;
  questions: SurveyQuestionRow[];
}

export interface PetitionRow {
  id: number;
  title: string;
  summary: string;
  ask: string;
  threshold: number;
  signature_count: number;
  closes_at: string | null;
  status: string;
  council_response: string | null;
  created_at: string;
  signed: boolean;
}

export interface InfoRequestRow {
  id: number;
  reference: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  decision: string | null;
  fees_cents: number | null;
  due_by: string;
  created_at: string;
}

export interface TenderRow {
  id: number;
  reference: string;
  title: string;
  description: string;
  category: string;
  estimated_value_cents: number | null;
  opens_at: string;
  closes_at: string;
  status: string;
  documents_url: string | null;
}

export interface ContractRow {
  id: number;
  contract_no: string;
  title: string;
  supplier_name: string;
  supplier_abn: string | null;
  value_cents: number;
  starts_on: string;
  ends_on: string;
  local_supplier: boolean;
  summary: string | null;
}

export interface JobRow {
  id: number;
  title: string;
  employer: string;
  is_council: boolean;
  kind: string;
  salary_min_cents: number | null;
  salary_max_cents: number | null;
  description: string;
  location: string | null;
  apply_url: string | null;
  posted_at: string;
  closes_at: string | null;
}

export interface RebateRow {
  id: number;
  level: string;
  title: string;
  description: string;
  category: string;
  max_amount_cents: number | null;
  eligibility: string;
  apply_url: string | null;
  expires_on: string | null;
}

export interface GardenPlotRow {
  id: number;
  garden_name: string;
  plot_code: string;
  size_sqm: number;
  annual_fee_cents: number;
  status: string;
  notes: string | null;
}

export interface ChatCitation {
  id: number;
  title: string;
  category: string;
  source_url: string | null;
}

// --- Staff rates ---

export interface RateCategoryRow {
  id: number;
  fiscal_year: number;
  code: string;
  label: string;
  ad_valorem_cents_per_dollar: number;
  base_amount_cents: number;
  minimum_cents: number;
  notes: string | null;
  is_active: boolean;
}

export interface RateCalcBreakdown {
  land_value_cents: number;
  ad_valorem_cents_per_dollar: number;
  base_amount_cents: number;
  minimum_cents: number;
  ad_valorem_component_cents: number;
  gross_cents: number;
  minimum_applied: boolean;
  concession_cents: number;
  total_cents: number;
}

export interface RateCalcResult {
  category: RateCategoryRow;
  breakdown: RateCalcBreakdown;
}

export interface RatePropertyRollRow {
  id: number;
  address: string;
  suburb: string | null;
  property_type: string;
  land_size_sqm: number | null;
  zone: string | null;
  latest_uv_cents: number | null;
  account_number: string | null;
  balance_cents: number;
  overdue: boolean;
}

export interface RatePropertyForStaff {
  id: number;
  address: string;
  suburb: string | null;
  property_type: string;
  land_size_sqm: number | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  valuations: { year: number; land_value_cents: number; capital_value_cents: number }[];
  rate_charges: { period_start: string; period_end: string; category: string;
                  amount_cents: number; note: string | null }[];
  concessions: { type: string; status: string; annual_value_cents: number | null }[];
  account_number: string | null;
  balance_cents: number;
  next_due_date: string | null;
  suggested_calc: RateCalcBreakdown | null;
  suggested_category: RateCategoryRow | null;
}

export interface RateKpis {
  properties: number;
  outstanding_cents: number;
  overdue_accounts: number;
  active_categories_current_fy: number;
  current_fy: number;
}

// --- v7 admin ---

export interface SearchGroup {
  label: string;
  href_template: string;
  items: { id: number; title: string; snippet: string }[];
}

export interface SearchResults {
  q: string;
  groups: SearchGroup[];
}

export interface FoiQueueRow {
  id: number;
  reference: string;
  title: string;
  kind: string;
  status: string;
  due_by: string;
  created_at: string;
  overdue: boolean;
  requester_email: string | null;
}

export interface KbArticleAdminRow {
  id: number;
  title: string;
  category: string;
  body: string;
  source_url: string | null;
  updated_at: string;
}

export interface SurveyResults {
  survey_id: number;
  total_responses: number;
  tallies: Record<string, Record<string, number>>;
}

export interface AdminJobRow {
  id: number;
  title: string;
  employer: string;
  is_council: boolean;
  kind: string;
  status: string;
  posted_at: string;
  closes_at: string | null;
}

export interface AdminTenderRow {
  id: number;
  reference: string;
  title: string;
  category: string;
  status: string;
  estimated_value_cents: number | null;
  opens_at: string;
  closes_at: string;
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
