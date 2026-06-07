"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { S68ActivityClass, S68Application, S68Prefill } from "@/lib/api";

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89 } as const;

interface Props {
  token: string;
  classes: S68ActivityClass[];
  prefill: S68Prefill;
  initialPart: string | null;
  initialSubtype: string | null;
  initialNewBuild: boolean;
}

export function Section68NewForm({
  token, classes, prefill, initialPart, initialSubtype, initialNewBuild,
}: Props) {
  const router = useRouter();
  const firstProp = prefill.properties[0];

  const [activityClass, setActivityClass] = React.useState<string>(
    initialPart ?? classes[0]?.code ?? "B");
  const [subtype, setSubtype] = React.useState<string>(() => {
    if (initialSubtype) return initialSubtype;
    const cls = classes.find((c) => c.code === (initialPart ?? "B"));
    return cls?.subtypes[0]?.key ?? "";
  });
  const [isNewBuild, setIsNewBuild] = React.useState<boolean>(initialNewBuild);
  const [linkedRef, setLinkedRef] = React.useState("");

  const [propertyPick, setPropertyPick] =
    React.useState<number | "manual">(firstProp ? firstProp.id : "manual");
  const [streetAddress, setStreetAddress] = React.useState(firstProp?.street_address ?? "");
  const [lot, setLot] = React.useState("");
  const [dp, setDp] = React.useState("");
  const [assessmentNo, setAssessmentNo] = React.useState(firstProp?.assessment_no ?? "");
  const [parcel, setParcel] = React.useState("");

  const [applicantName, setApplicantName] = React.useState(prefill.applicant_name);
  const [postalAddress, setPostalAddress] =
    React.useState(prefill.postal_address ?? "");
  const [contactPhone, setContactPhone] = React.useState(prefill.contact_phone ?? "");
  const [contactEmail, setContactEmail] = React.useState(prefill.contact_email);

  const [description, setDescription] = React.useState("");

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeClass = classes.find((c) => c.code === activityClass);
  const activeSubtype = activeClass?.subtypes.find((st) => st.key === subtype);

  function onClassChange(code: string) {
    setActivityClass(code);
    const cls = classes.find((c) => c.code === code);
    setSubtype(cls?.subtypes[0]?.key ?? "");
  }

  function onPropertyPick(value: string) {
    if (value === "manual") {
      setPropertyPick("manual");
      setStreetAddress("");
      setAssessmentNo("");
      return;
    }
    const id = Number(value);
    const p = prefill.properties.find((x) => x.id === id);
    if (!p) return;
    setPropertyPick(id);
    setStreetAddress(p.street_address);
    setAssessmentNo(p.assessment_no ?? "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        activity_class: activityClass,
        activity_subtype: subtype,
        is_new_build: isNewBuild,
        linked_cdc_da_ref: linkedRef.trim() || null,
        street_address: streetAddress.trim(),
        lot: lot.trim() || null,
        dp: dp.trim() || null,
        assessment_no: assessmentNo.trim() || null,
        parcel: parcel.trim() || null,
        applicant_name: applicantName.trim(),
        applicant_postal_address: postalAddress.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        description: description.trim(),
      };
      const res = await fetch(`${API_BASE}/api/section-68`, {
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
        throw new Error(typeof data?.detail === "string"
          ? data.detail
          : "Couldn't start the application.");
      }
      const out: S68Application = await res.json();
      router.push(`/section-68/${out.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <main className="s68n">
        <header className="s68n-head">
          <Link href="/section-68" className="s68n-back">← Section 68</Link>
          <span className="s68n-tag">New application</span>
        </header>

        <section className="s68n-hero">
          <h1>Start a Section 68.</h1>
          <p>
            Pick the activity, point at the property, and we'll wire up any
            sub-forms (like the flow-rate test) once it's lodged.
          </p>
        </section>

        <form className="s68n-form" onSubmit={onSubmit} noValidate>
          <Section n={1} title="Activity">
            <Field label="Part">
              <select value={activityClass}
                      onChange={(e) => onClassChange(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.code} value={c.code}>Part {c.code} — {c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Specific activity">
              <select value={subtype}
                      onChange={(e) => setSubtype(e.target.value)}>
                {activeClass?.subtypes.map((st) => (
                  <option key={st.key} value={st.key}>{st.label}</option>
                ))}
              </select>
            </Field>
            {activeSubtype?.sub_form_key === "flow_rate_test" && (
              <p className="s68n-note">
                <strong>Heads up.</strong> A flow-rate test (WS-FO-206) is
                required for this activity. After lodging, we'll surface a
                "Start flow-rate test" button on the application page.
              </p>
            )}
          </Section>

          <Section n={2} title="New build?">
            <Toggle
              label="This Section 68 is part of a new building"
              note="Required when the activity ties to a CDC or DA."
              checked={isNewBuild}
              onChange={setIsNewBuild}
            />
            {isNewBuild && (
              <Field label="CDC / DA reference" required>
                <input value={linkedRef} required
                       placeholder="e.g. DA/2026/0456 or CDC/2026/0123"
                       onChange={(e) => setLinkedRef(e.target.value)} />
              </Field>
            )}
          </Section>

          <Section n={3} title="Property">
            {prefill.properties.length > 0 && (
              <Field label="Use one of your properties">
                <select value={String(propertyPick)}
                        onChange={(e) => onPropertyPick(e.target.value)}>
                  {prefill.properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.street_address}</option>
                  ))}
                  <option value="manual">Enter a different address…</option>
                </select>
              </Field>
            )}
            <Field label="Street address" required>
              <input value={streetAddress} required
                     onChange={(e) => setStreetAddress(e.target.value)} />
            </Field>
            <div className="s68n-row">
              <Field label="Lot"><input value={lot}
                onChange={(e) => setLot(e.target.value)} /></Field>
              <Field label="DP"><input value={dp}
                onChange={(e) => setDp(e.target.value)} /></Field>
            </div>
            <div className="s68n-row">
              <Field label="Assessment no.">
                <input value={assessmentNo}
                       onChange={(e) => setAssessmentNo(e.target.value)} />
              </Field>
              <Field label="Parcel">
                <input value={parcel}
                       onChange={(e) => setParcel(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section n={4} title="Applicant">
            <Field label="Name" required>
              <input value={applicantName} required
                     onChange={(e) => setApplicantName(e.target.value)} />
            </Field>
            <Field label="Postal address" required>
              <textarea value={postalAddress} required rows={2}
                        onChange={(e) => setPostalAddress(e.target.value)} />
            </Field>
            <div className="s68n-row">
              <Field label="Phone" required>
                <input value={contactPhone} required type="tel"
                       onChange={(e) => setContactPhone(e.target.value)} />
              </Field>
              <Field label="Email" required>
                <input value={contactEmail} required type="email"
                       onChange={(e) => setContactEmail(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section n={5} title="Describe the work">
            <Field label="What's being done?" required>
              <textarea value={description} required rows={4}
                        placeholder="e.g. new water service connection to a single-storey
dwelling, 25mm tail, internal hydrant plan attached."
                        onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </Section>

          {error && <p className="s68n-error" role="alert">{error}</p>}

          <div className="s68n-actions">
            <button type="submit" className="s68n-btn" disabled={pending}>
              {pending ? "Lodging…" : "Lodge application →"}
            </button>
            <Link href="/section-68" className="s68n-link">Cancel</Link>
          </div>
        </form>
      </main>
    </>
  );
}

function Section({ n, title, children }: {
  n: number; title: string; children: React.ReactNode;
}) {
  return (
    <section className="s68n-section">
      <header>
        <span className="s68n-section-num">{String(n).padStart(2, "0")}</span>
        <h2>{title}</h2>
      </header>
      <div className="s68n-section-body">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="s68n-field">
      <span className="s68n-field-label">
        {label}{required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, note, checked, onChange }: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`s68n-toggle${checked ? " is-on" : ""}`}>
      <input type="checkbox" checked={checked}
             onChange={(e) => onChange(e.target.checked)} />
      <span className="s68n-toggle-box" aria-hidden="true">
        <span className="s68n-toggle-tick">{checked ? "✓" : ""}</span>
      </span>
      <span className="s68n-toggle-label">
        {label}
        {note && <span className="s68n-toggle-note">{note}</span>}
      </span>
    </label>
  );
}

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
}
* { box-sizing: border-box; }

.s68n {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--ink);
  padding: ${fib[21]}px ${fib[13]}px ${fib[55]}px;
  font-family: inherit;
}
.s68n-head, .s68n-hero, .s68n-form {
  width: 100%;
  max-width: 610px;
  margin: 0 auto;
}
.s68n-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${fib[21]}px;
}
.s68n-back { font-size: ${fib[13]}px; color: var(--ink-2); text-decoration: none; }
.s68n-tag {
  font-size: ${fib[8] + 2}px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.s68n-hero { margin-bottom: ${fib[34]}px; }
.s68n-hero h1 {
  margin: 0 0 ${fib[5]}px;
  font-size: ${fib[34]}px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.s68n-hero p {
  margin: 0;
  font-size: ${fib[13] + 2}px;
  line-height: 1.45;
  color: var(--ink-2);
}

.s68n-form { display: flex; flex-direction: column; gap: ${fib[34]}px; }

.s68n-section { }
.s68n-section header {
  display: flex;
  gap: ${fib[13]}px;
  align-items: baseline;
  margin-bottom: ${fib[13]}px;
  padding-bottom: ${fib[8]}px;
  border-bottom: 1px solid var(--line);
}
.s68n-section-num {
  font-size: ${fib[13] - 1}px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.s68n-section header h2 {
  margin: 0;
  font-size: ${fib[13] + 5}px;
  font-weight: 600;
}
.s68n-section-body { display: flex; flex-direction: column; gap: ${fib[13]}px; }

.s68n-row { display: grid; grid-template-columns: 1fr 1fr; gap: ${fib[13]}px; }
@media (max-width: 480px) { .s68n-row { grid-template-columns: 1fr; } }

.s68n-field { display: flex; flex-direction: column; gap: 4px; }
.s68n-field-label { font-size: ${fib[13]}px; font-weight: 500; color: var(--ink); }
.s68n-field-label em { color: var(--accent); font-style: normal; }
.s68n-field input,
.s68n-field textarea,
.s68n-field select {
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
.s68n-field textarea { resize: vertical; min-height: ${fib[34]}px; }
.s68n-field input:focus,
.s68n-field textarea:focus,
.s68n-field select:focus {
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(26, 31, 46, 0.08);
}

.s68n-toggle {
  display: flex;
  align-items: flex-start;
  gap: ${fib[8]}px;
  padding: ${fib[13]}px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[8]}px;
  cursor: pointer;
}
.s68n-toggle.is-on { border-color: var(--ink); }
.s68n-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.s68n-toggle-box {
  flex: 0 0 auto;
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--ink-3);
  display: flex; align-items: center; justify-content: center;
  margin-top: 1px;
}
.s68n-toggle.is-on .s68n-toggle-box { background: var(--ink); border-color: var(--ink); }
.s68n-toggle-tick { color: #fff; font-size: ${fib[13]}px; line-height: 1; }
.s68n-toggle-label {
  display: flex; flex-direction: column; gap: 2px;
  font-size: ${fib[13] + 1}px; font-weight: 500; color: var(--ink);
}
.s68n-toggle-note { font-size: ${fib[13] - 1}px; font-weight: 400; color: var(--ink-2); }

.s68n-note {
  margin: 0;
  padding: ${fib[8] + 2}px ${fib[13]}px;
  background: var(--line-soft);
  border-left: 3px solid var(--accent);
  border-radius: ${fib[5]}px;
  font-size: ${fib[13]}px;
  color: var(--ink-2);
  line-height: 1.5;
}
.s68n-note strong { display: block; color: var(--ink); margin-bottom: 2px; }

.s68n-error {
  margin: 0;
  padding: ${fib[13]}px;
  background: #fef3f2;
  border: 1px solid #fecdca;
  border-radius: ${fib[5] + 1}px;
  color: var(--danger);
  font-size: ${fib[13]}px;
}

.s68n-actions {
  display: flex; align-items: center; gap: ${fib[13]}px; margin-top: ${fib[13]}px;
}
.s68n-btn {
  padding: ${fib[8] + 2}px ${fib[21]}px;
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
}
.s68n-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.s68n-link { font-size: ${fib[13]}px; color: var(--ink-2); text-decoration: none; }
`;
