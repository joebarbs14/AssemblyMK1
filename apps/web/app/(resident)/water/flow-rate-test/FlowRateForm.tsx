"use client";

import Link from "next/link";
import * as React from "react";

import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89, 144: 144 } as const;

export interface PrefillProperty {
  id: number;
  street_address: string;
  assessment_no: string | null;
  suburb: string | null;
  postcode: string | null;
}

export interface Prefill {
  applicant_name: string;
  contact_email: string;
  contact_phone: string | null;
  postal_address: string | null;
  properties: PrefillProperty[];
}

interface SubmitOut {
  id: number;
  reference: string;
  status: string;
  requires_hydraulic_calc: boolean;
  street_address: string;
  test_type: string;
}

interface State {
  // Section 68 / DA
  is_section_68: boolean;
  section_68_ref: string;
  cdc_da_ref: string;

  // Applicant
  applicant_name: string;
  applicant_postal_address: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;

  // Hydrants
  hydrant_asset_id_primary: string;
  hydrant_asset_id_secondary: string;
  test_type: "single" | "dual";

  // Property
  selected_property_id: number | "manual";
  street_address: string;
  lot: string;
  dp: string;
  assessment_no: string;
  parcel: string;
  property_description: string;
  building_over_25m: boolean;

  // Purpose
  purpose_fire_service: boolean;
  purpose_town_supply: boolean;
  purpose_mains_extension: boolean;
  purpose_other: boolean;
  purpose_other_text: string;
  new_street_hydrant: boolean;

  // Fire-service breakdown
  internal_hydrants: boolean;
  internal_hydrants_count: string;
  hose_reels: boolean;
  hose_reels_count: string;
  sprinklers: boolean;
  sprinklers_count: string;

  // Signature
  signed_name: string;
}

function initialState(p: Prefill): State {
  const first = p.properties[0];
  return {
    is_section_68: false,
    section_68_ref: "",
    cdc_da_ref: "",
    applicant_name: p.applicant_name ?? "",
    applicant_postal_address: p.postal_address ?? "",
    company_name: "",
    contact_phone: p.contact_phone ?? "",
    contact_email: p.contact_email ?? "",
    hydrant_asset_id_primary: "",
    hydrant_asset_id_secondary: "",
    test_type: "single",
    selected_property_id: first ? first.id : "manual",
    street_address: first?.street_address ?? "",
    lot: "",
    dp: "",
    assessment_no: first?.assessment_no ?? "",
    parcel: "",
    property_description: "",
    building_over_25m: false,
    purpose_fire_service: false,
    purpose_town_supply: false,
    purpose_mains_extension: false,
    purpose_other: false,
    purpose_other_text: "",
    new_street_hydrant: false,
    internal_hydrants: false,
    internal_hydrants_count: "",
    hose_reels: false,
    hose_reels_count: "",
    sprinklers: false,
    sprinklers_count: "",
    signed_name: p.applicant_name ?? "",
  };
}

export function FlowRateForm({ token, prefill }: { token: string; prefill: Prefill }) {
  const [s, setS] = React.useState<State>(() => initialState(prefill));
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<SubmitOut | null>(null);

  function set<K extends keyof State>(key: K, value: State[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function onPropertyPick(value: string) {
    if (value === "manual") {
      setS((prev) => ({
        ...prev,
        selected_property_id: "manual",
        street_address: "",
        assessment_no: "",
      }));
      return;
    }
    const id = Number(value);
    const p = prefill.properties.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({
      ...prev,
      selected_property_id: id,
      street_address: p.street_address,
      assessment_no: p.assessment_no ?? "",
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        is_section_68: s.is_section_68,
        section_68_ref: s.section_68_ref.trim() || null,
        cdc_da_ref: s.cdc_da_ref.trim() || null,
        applicant_name: s.applicant_name.trim(),
        applicant_postal_address: s.applicant_postal_address.trim(),
        company_name: s.company_name.trim() || null,
        contact_phone: s.contact_phone.trim(),
        contact_email: s.contact_email.trim(),
        hydrant_asset_id_primary: s.hydrant_asset_id_primary.trim() || null,
        hydrant_asset_id_secondary: s.hydrant_asset_id_secondary.trim() || null,
        test_type: s.test_type,
        street_address: s.street_address.trim(),
        lot: s.lot.trim() || null,
        dp: s.dp.trim() || null,
        assessment_no: s.assessment_no.trim() || null,
        parcel: s.parcel.trim() || null,
        property_description: s.property_description.trim() || null,
        building_over_25m: s.building_over_25m,
        purpose_fire_service: s.purpose_fire_service,
        purpose_town_supply: s.purpose_town_supply,
        purpose_mains_extension: s.purpose_mains_extension,
        purpose_other: s.purpose_other,
        purpose_other_text: s.purpose_other_text.trim() || null,
        new_street_hydrant: s.new_street_hydrant,
        internal_hydrants: s.internal_hydrants,
        internal_hydrants_count: s.internal_hydrants_count
          ? Number(s.internal_hydrants_count) : null,
        hose_reels: s.hose_reels,
        hose_reels_count: s.hose_reels_count ? Number(s.hose_reels_count) : null,
        sprinklers: s.sprinklers,
        sprinklers_count: s.sprinklers_count ? Number(s.sprinklers_count) : null,
        signed_name: s.signed_name.trim(),
      };
      const res = await fetch(`${API_BASE}/api/water/flow-rate-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = typeof data?.detail === "string"
          ? data.detail
          : "We couldn't submit the application. Check the form and try again.";
        throw new Error(detail);
      }
      const out: SubmitOut = await res.json();
      setSuccess(out);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <>
        <style>{CSS}</style>
        <main className="frt">
          <div className="frt-card frt-success">
            <span className="frt-success-eyebrow">Application received</span>
            <h1 className="frt-success-h1">Thanks — we&apos;ve got it.</h1>
            <p className="frt-success-lede">
              Your reference is <strong>{success.reference}</strong>. Water Operations
              will review and contact you to schedule the test.
            </p>
            <dl className="frt-summary">
              <div><dt>Property</dt><dd>{success.street_address}</dd></div>
              <div><dt>Test type</dt>
                <dd>{success.test_type === "dual"
                  ? "Simultaneous dual hydrant" : "Single hydrant"}</dd></div>
              <div><dt>Status</dt><dd>{success.status}</dd></div>
              {success.requires_hydraulic_calc && (
                <div>
                  <dt>Next step</dt>
                  <dd>
                    A hydraulic calculation report is required for fire-service
                    connections. Please send it through with your reference.
                  </dd>
                </div>
              )}
            </dl>
            <p className="frt-fine">
              The applicable fee from the Management Plan (Fees &amp; Charges) must
              be paid for the test to proceed. Test results are valid for 6 months.
              Please work off 40&nbsp;m head pressure to accommodate future
              installation of pressure reduction valves.
            </p>
            <div className="frt-success-row">
              <Link href="/water" className="frt-link">← Back to Water</Link>
              <button type="button" className="frt-btn"
                      onClick={() => { setSuccess(null); setS(initialState(prefill)); }}>
                Lodge another
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <main className="frt">
        <header className="frt-head">
          <Link href="/water" className="frt-back">← Water</Link>
          <span className="frt-tag">WS-FO-206</span>
        </header>

        <section className="frt-hero">
          <h1>Apply for a flow rate test.</h1>
          <p>
            Hydrant flow and pressure data for fire service, town-supply
            connections, mains extensions, or design certification.
          </p>
        </section>

        <form className="frt-form" onSubmit={onSubmit} noValidate>
          {/* ---------- Section 68 / DA ---------- */}
          <Section
            n={1}
            title="Section 68 / DA reference"
            lede="Skip if this isn't tied to a development application."
          >
            <YesNo
              label="Is this part of a Section 68 application?"
              value={s.is_section_68}
              onChange={(v) => set("is_section_68", v)}
            />
            {s.is_section_68 && (
              <Field label="S68 reference">
                <input value={s.section_68_ref}
                       onChange={(e) => set("section_68_ref", e.target.value)}
                       placeholder="e.g. S68/2026/0123" />
              </Field>
            )}
            <Field label="CDC / DA reference (optional)">
              <input value={s.cdc_da_ref}
                     onChange={(e) => set("cdc_da_ref", e.target.value)}
                     placeholder="e.g. DA/2026/0456" />
            </Field>
          </Section>

          {/* ---------- Applicant ---------- */}
          <Section n={2} title="Applicant details" lede="We've prefilled what we know.">
            <Field label="Applicant name" required>
              <input value={s.applicant_name} required
                     onChange={(e) => set("applicant_name", e.target.value)} />
            </Field>
            <Field label="Postal address" required>
              <textarea value={s.applicant_postal_address} required rows={2}
                        onChange={(e) => set("applicant_postal_address", e.target.value)} />
            </Field>
            <Field label="Company name (if applicable)">
              <input value={s.company_name}
                     onChange={(e) => set("company_name", e.target.value)} />
            </Field>
            <div className="frt-row">
              <Field label="Contact phone" required>
                <input value={s.contact_phone} type="tel" required
                       autoComplete="tel"
                       onChange={(e) => set("contact_phone", e.target.value)} />
              </Field>
              <Field label="Contact email" required>
                <input value={s.contact_email} type="email" required
                       autoComplete="email"
                       onChange={(e) => set("contact_email", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* ---------- Hydrants ---------- */}
          <Section
            n={3}
            title="Hydrants"
            lede="Nominate up to two hydrant asset IDs. Single or simultaneous dual test."
          >
            <div className="frt-row">
              <Field label="Primary hydrant — PHY">
                <input value={s.hydrant_asset_id_primary}
                       onChange={(e) => set("hydrant_asset_id_primary", e.target.value)}
                       placeholder="e.g. 18452" />
              </Field>
              <Field label={s.test_type === "dual"
                  ? "Secondary hydrant — PHY"
                  : "Secondary hydrant — PHY (dual test only)"}>
                <input value={s.hydrant_asset_id_secondary}
                       disabled={s.test_type !== "dual"}
                       onChange={(e) => set("hydrant_asset_id_secondary", e.target.value)} />
              </Field>
            </div>
            <Field label="Test type" required>
              <div className="frt-pillgroup" role="radiogroup">
                {([
                  { id: "single", label: "Single hydrant" },
                  { id: "dual", label: "Simultaneous dual" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={s.test_type === opt.id}
                    className={`frt-pill${s.test_type === opt.id ? " is-active" : ""}`}
                    onClick={() => set("test_type", opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ---------- Property ---------- */}
          <Section n={4} title="Property to be tested">
            {prefill.properties.length > 0 && (
              <Field label="Use one of your properties">
                <select
                  value={String(s.selected_property_id)}
                  onChange={(e) => onPropertyPick(e.target.value)}
                >
                  {prefill.properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.street_address}</option>
                  ))}
                  <option value="manual">Enter a different address…</option>
                </select>
              </Field>
            )}
            <Field label="Street address" required>
              <input value={s.street_address} required
                     onChange={(e) => set("street_address", e.target.value)} />
            </Field>
            <div className="frt-row">
              <Field label="Lot"><input value={s.lot}
                onChange={(e) => set("lot", e.target.value)} /></Field>
              <Field label="DP"><input value={s.dp}
                onChange={(e) => set("dp", e.target.value)} /></Field>
            </div>
            <div className="frt-row">
              <Field label="Assessment no."><input value={s.assessment_no}
                onChange={(e) => set("assessment_no", e.target.value)} /></Field>
              <Field label="Parcel"><input value={s.parcel}
                onChange={(e) => set("parcel", e.target.value)} /></Field>
            </div>
            <Field label="Description"
                   hint="e.g. 6 × residential flats, industrial unit, school block A.">
              <input value={s.property_description}
                     onChange={(e) => set("property_description", e.target.value)} />
            </Field>
            <YesNo
              label="Does building height exceed 25 metres?"
              value={s.building_over_25m}
              onChange={(v) => set("building_over_25m", v)}
            />
          </Section>

          {/* ---------- Purpose ---------- */}
          <Section n={5} title="Purpose of test" lede="Tick everything that applies.">
            <div className="frt-checks">
              <Toggle
                label="Fire service"
                checked={s.purpose_fire_service}
                onChange={(v) => set("purpose_fire_service", v)}
                note="Hydraulic calculation report required."
              />
              <Toggle
                label="Connection to town supply"
                checked={s.purpose_town_supply}
                onChange={(v) => set("purpose_town_supply", v)}
              />
              <Toggle
                label="Mains extension"
                checked={s.purpose_mains_extension}
                onChange={(v) => set("purpose_mains_extension", v)}
              />
              <Toggle
                label="Other"
                checked={s.purpose_other}
                onChange={(v) => set("purpose_other", v)}
              />
            </div>
            {s.purpose_other && (
              <Field label="Describe the other purpose" required>
                <input value={s.purpose_other_text} required
                       onChange={(e) => set("purpose_other_text", e.target.value)} />
              </Field>
            )}
            <YesNo
              label="New street hydrant installation required?"
              value={s.new_street_hydrant}
              onChange={(v) => set("new_street_hydrant", v)}
            />
          </Section>

          {/* ---------- Fire-service breakdown ---------- */}
          {s.purpose_fire_service && (
            <Section
              n={6}
              title="Fire service breakdown"
              lede="Hydraulic calculation report will be required."
            >
              <CountRow label="Internal hydrants"
                        on={s.internal_hydrants}
                        count={s.internal_hydrants_count}
                        onOn={(v) => set("internal_hydrants", v)}
                        onCount={(v) => set("internal_hydrants_count", v)} />
              <CountRow label="Hose reels"
                        on={s.hose_reels}
                        count={s.hose_reels_count}
                        onOn={(v) => set("hose_reels", v)}
                        onCount={(v) => set("hose_reels_count", v)} />
              <CountRow label="Sprinklers"
                        on={s.sprinklers}
                        count={s.sprinklers_count}
                        onOn={(v) => set("sprinklers", v)}
                        onCount={(v) => set("sprinklers_count", v)} />
            </Section>
          )}

          {/* ---------- Signature ---------- */}
          <Section
            n={s.purpose_fire_service ? 7 : 6}
            title="Declaration"
            lede="By typing your name you confirm the details above are correct."
          >
            <Field label="Signed (full name)" required>
              <input value={s.signed_name} required
                     onChange={(e) => set("signed_name", e.target.value)} />
            </Field>
            <p className="frt-note">
              <strong>Before you submit.</strong> Test results are valid for
              6&nbsp;months. Please work off 40&nbsp;m head pressure to
              accommodate future installation of pressure reduction valves. The
              applicable fee (Management Plan — Fees &amp; Charges) must be paid
              at lodgement.
            </p>
          </Section>

          {error && <p className="frt-error" role="alert">{error}</p>}

          <div className="frt-actions">
            <button type="submit" className="frt-btn" disabled={pending}>
              {pending ? "Submitting…" : "Submit application →"}
            </button>
            <Link href="/water" className="frt-link">Cancel</Link>
          </div>
        </form>
      </main>
    </>
  );
}

// --------------------------------------------------------------------- //
// Small primitives                                                      //
// --------------------------------------------------------------------- //

function Section({
  n, title, lede, children,
}: {
  n: number; title: string; lede?: string; children: React.ReactNode;
}) {
  return (
    <section className="frt-section">
      <header className="frt-section-head">
        <span className="frt-section-num">{String(n).padStart(2, "0")}</span>
        <div>
          <h2>{title}</h2>
          {lede && <p>{lede}</p>}
        </div>
      </header>
      <div className="frt-section-body">{children}</div>
    </section>
  );
}

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="frt-field">
      <span className="frt-field-label">
        {label}{required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
      {hint && <span className="frt-field-hint">{hint}</span>}
    </label>
  );
}

function YesNo({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="frt-field">
      <span className="frt-field-label">{label}</span>
      <div className="frt-pillgroup" role="radiogroup">
        {([
          { id: true, label: "Yes" },
          { id: false, label: "No" },
        ] as const).map((opt) => (
          <button
            key={String(opt.id)}
            type="button"
            role="radio"
            aria-checked={value === opt.id}
            className={`frt-pill${value === opt.id ? " is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label, checked, onChange, note,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; note?: string;
}) {
  return (
    <label className={`frt-toggle${checked ? " is-on" : ""}`}>
      <input type="checkbox" checked={checked}
             onChange={(e) => onChange(e.target.checked)} />
      <span className="frt-toggle-box" aria-hidden="true">
        <span className="frt-toggle-tick">{checked ? "✓" : ""}</span>
      </span>
      <span className="frt-toggle-label">
        {label}
        {note && <span className="frt-toggle-note">{note}</span>}
      </span>
    </label>
  );
}

function CountRow({
  label, on, count, onOn, onCount,
}: {
  label: string;
  on: boolean;
  count: string;
  onOn: (v: boolean) => void;
  onCount: (v: string) => void;
}) {
  return (
    <div className="frt-countrow">
      <Toggle label={label} checked={on} onChange={onOn} />
      {on && (
        <label className="frt-count">
          <span>How many?</span>
          <input type="number" min={0} max={999} inputMode="numeric"
                 value={count} onChange={(e) => onCount(e.target.value)} />
        </label>
      )}
    </div>
  );
}

// --------------------------------------------------------------------- //
// Styles                                                                //
// --------------------------------------------------------------------- //

const CSS = `
:root {
  --bg: #FAFAF8;
  --surface: #FFFFFF;
  --ink: #1A1F2E;
  --ink-2: #6B7280;
  --ink-3: #9AA0A6;
  --line: #E8E6E1;
  --line-soft: #F1EFEA;
  --accent: #3FA8A4;
  --danger: #B42318;
  --danger-bg: #fef3f2;
}
* { box-sizing: border-box; }

.frt {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--ink);
  padding: ${fib[34]}px ${fib[21]}px ${fib[89]}px;
  font-family: inherit;
}
.frt-head, .frt-hero, .frt-form, .frt-card {
  width: 100%;
  max-width: 610px;
  margin: 0 auto;
}
.frt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${fib[55]}px;
}
.frt-back {
  font-size: ${fib[13]}px;
  color: var(--ink-2);
  text-decoration: none;
}
.frt-back:hover { color: var(--ink); }
.frt-tag {
  font-size: ${fib[13] - 1}px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.frt-hero { margin-bottom: ${fib[55]}px; }
.frt-hero h1 {
  margin: 0 0 ${fib[13]}px;
  font-size: ${fib[55] - 8}px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.frt-hero p {
  margin: 0;
  font-size: ${fib[21] - 3}px;
  line-height: 1.45;
  color: var(--ink-2);
  max-width: 50ch;
}

.frt-form {
  display: flex;
  flex-direction: column;
  gap: ${fib[55]}px;
}

/* === Section === */
.frt-section { }
.frt-section-head {
  display: flex;
  gap: ${fib[13]}px;
  align-items: baseline;
  margin-bottom: ${fib[21]}px;
  padding-bottom: ${fib[13]}px;
  border-bottom: 1px solid var(--line);
}
.frt-section-num {
  font-size: ${fib[13]}px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.frt-section-head h2 {
  margin: 0;
  font-size: ${fib[21]}px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.frt-section-head p {
  margin: ${fib[5]}px 0 0;
  font-size: ${fib[13] + 1}px;
  color: var(--ink-2);
  line-height: 1.4;
}
.frt-section-body {
  display: flex;
  flex-direction: column;
  gap: ${fib[21]}px;
}

/* === Field === */
.frt-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${fib[21]}px;
}
.frt-field {
  display: flex;
  flex-direction: column;
  gap: ${fib[5]}px;
}
.frt-field-label {
  font-size: ${fib[13]}px;
  font-weight: 500;
  color: var(--ink);
}
.frt-field-label em { color: var(--accent); font-style: normal; }
.frt-field-hint {
  font-size: ${fib[13] - 1}px;
  color: var(--ink-2);
}

.frt-field input,
.frt-field textarea,
.frt-field select {
  width: 100%;
  padding: ${fib[8] + 2}px ${fib[13]}px;
  font-size: ${fib[13] + 2}px;
  font-family: inherit;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[5] + 1}px;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.frt-field textarea { resize: vertical; min-height: ${fib[55]}px; }
.frt-field input:focus,
.frt-field textarea:focus,
.frt-field select:focus {
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(26, 31, 46, 0.08);
}
.frt-field input:disabled {
  background: var(--line-soft);
  color: var(--ink-3);
  cursor: not-allowed;
}

/* === Pill group (Yes/No, test type) === */
.frt-pillgroup {
  display: inline-flex;
  background: var(--line-soft);
  border-radius: 999px;
  padding: 3px;
  gap: 3px;
}
.frt-pill {
  padding: ${fib[5]}px ${fib[21]}px;
  font-size: ${fib[13]}px;
  font-weight: 500;
  font-family: inherit;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}
.frt-pill.is-active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(26, 31, 46, 0.06), 0 0 0 1px var(--line);
}

/* === Toggle (checkbox styled) === */
.frt-checks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${fib[13]}px;
}
.frt-toggle {
  display: flex;
  align-items: flex-start;
  gap: ${fib[8]}px;
  padding: ${fib[13]}px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[8]}px;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}
.frt-toggle:hover { border-color: var(--ink-3); }
.frt-toggle.is-on { border-color: var(--ink); background: var(--surface); }
.frt-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.frt-toggle-box {
  flex: 0 0 auto;
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--ink-3);
  display: flex; align-items: center; justify-content: center;
  margin-top: 1px;
}
.frt-toggle.is-on .frt-toggle-box {
  background: var(--ink);
  border-color: var(--ink);
}
.frt-toggle-tick {
  color: #fff;
  font-size: ${fib[13]}px;
  line-height: 1;
}
.frt-toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${fib[13] + 1}px;
  font-weight: 500;
  color: var(--ink);
}
.frt-toggle-note {
  font-size: ${fib[13] - 1}px;
  font-weight: 400;
  color: var(--ink-2);
}

/* === Count row (toggle + number) === */
.frt-countrow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${fib[13]}px;
  align-items: start;
}
.frt-count {
  display: flex;
  flex-direction: column;
  gap: ${fib[5]}px;
  min-width: 120px;
}
.frt-count span {
  font-size: ${fib[13] - 1}px;
  color: var(--ink-2);
}
.frt-count input {
  width: 100%;
  padding: ${fib[8]}px ${fib[13]}px;
  font-size: ${fib[13] + 2}px;
  font-family: inherit;
  border: 1px solid var(--line);
  border-radius: ${fib[5] + 1}px;
  outline: none;
}

.frt-note {
  margin: 0;
  padding: ${fib[13]}px ${fib[21]}px;
  background: var(--line-soft);
  border-left: 3px solid var(--accent);
  border-radius: ${fib[5]}px;
  font-size: ${fib[13]}px;
  color: var(--ink-2);
  line-height: 1.5;
}
.frt-note strong { color: var(--ink); display: block; margin-bottom: ${fib[3]}px; }

.frt-error {
  margin: 0;
  padding: ${fib[13]}px ${fib[21]}px;
  background: var(--danger-bg);
  border: 1px solid #fecdca;
  border-radius: ${fib[5] + 1}px;
  color: var(--danger);
  font-size: ${fib[13] + 1}px;
}

/* === Actions === */
.frt-actions {
  display: flex;
  align-items: center;
  gap: ${fib[21]}px;
  margin-top: ${fib[21]}px;
}
.frt-btn {
  padding: ${fib[13]}px ${fib[34]}px;
  font-size: ${fib[13] + 1}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: inherit;
  cursor: pointer;
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: ${fib[5] + 1}px;
  transition: opacity 160ms ease, transform 120ms ease;
}
.frt-btn:hover:not(:disabled) { opacity: 0.9; }
.frt-btn:active:not(:disabled) { transform: translateY(1px); }
.frt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.frt-link {
  font-size: ${fib[13] + 1}px;
  color: var(--ink-2);
  text-decoration: none;
}
.frt-link:hover { color: var(--ink); }

/* === Success === */
.frt-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[13]}px;
  padding: ${fib[34]}px;
  box-shadow: 0 1px 2px rgba(26, 31, 46, 0.04);
}
.frt-success-eyebrow {
  display: inline-block;
  font-size: ${fib[13] - 1}px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
}
.frt-success-h1 {
  margin: ${fib[13]}px 0 ${fib[13]}px;
  font-size: ${fib[34]}px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.frt-success-lede {
  margin: 0 0 ${fib[21]}px;
  font-size: ${fib[13] + 2}px;
  color: var(--ink-2);
  line-height: 1.5;
}
.frt-success-lede strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.frt-summary {
  margin: 0 0 ${fib[21]}px;
  padding: ${fib[21]}px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: ${fib[13]}px;
}
.frt-summary div { display: grid; grid-template-columns: 140px 1fr; gap: ${fib[13]}px; }
.frt-summary dt {
  font-size: ${fib[13] - 1}px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.frt-summary dd {
  margin: 0;
  font-size: ${fib[13] + 1}px;
  color: var(--ink);
}
.frt-fine {
  margin: 0 0 ${fib[21]}px;
  font-size: ${fib[13]}px;
  color: var(--ink-2);
  line-height: 1.5;
}
.frt-success-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${fib[13]}px;
}

@media (max-width: 600px) {
  .frt { padding: ${fib[21]}px ${fib[13]}px ${fib[55]}px; }
  .frt-hero h1 { font-size: ${fib[34]}px; }
  .frt-hero p { font-size: ${fib[13] + 2}px; }
  .frt-row,
  .frt-checks { grid-template-columns: 1fr; }
  .frt-form { gap: ${fib[34]}px; }
  .frt-summary div { grid-template-columns: 1fr; }
  .frt-summary dd { margin-top: -${fib[8]}px; }
}
`;
