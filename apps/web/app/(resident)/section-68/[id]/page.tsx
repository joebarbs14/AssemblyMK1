import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { api, type S68ActivityClass, type S68Application } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89 } as const;

export const metadata = { title: "Section 68 application — Assembly" };

export default async function Section68DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const appId = Number(id);
  if (!Number.isFinite(appId)) notFound();

  const [app, classes] = await Promise.all([
    api<S68Application>(`/api/section-68/${appId}`, { token }).catch(() => null),
    api<S68ActivityClass[]>("/api/section-68/activity-classes", { token }),
  ]);
  if (!app) notFound();

  const cls = classes.find((c) => c.code === app.activity_class);
  const subtype = cls?.subtypes.find((st) => st.key === app.activity_subtype);
  const subtypeLabel = subtype?.label ?? app.activity_subtype;

  const flowRateAttached = app.sub_forms.find((s) => s.kind === "flow_rate_test");
  const needsFlowRate = subtype?.sub_form_key === "flow_rate_test";

  return (
    <>
      <style>{CSS}</style>
      <main className="s68v">
        <header className="s68v-head">
          <Link href="/section-68" className="s68v-back">← Section 68</Link>
          <span className={`s68v-status s68v-status-${app.status}`}>{app.status}</span>
        </header>

        <section className="s68v-hero">
          <p className="s68v-ref">{app.reference}</p>
          <h1>Part {app.activity_class} · {subtypeLabel}</h1>
          <p className="s68v-sub">
            {app.street_address}
            {app.is_new_build && app.linked_cdc_da_ref
              ? ` · New build · ${app.linked_cdc_da_ref}`
              : app.is_new_build ? " · New build" : ""}
          </p>
        </section>

        <section className="s68v-card">
          <h2>What you applied for</h2>
          <p className="s68v-desc">{app.description}</p>
        </section>

        <section className="s68v-card">
          <header className="s68v-card-head">
            <h2>Sub-forms</h2>
            <span className="s68v-card-meta">
              {app.sub_forms.length} attached
            </span>
          </header>

          {needsFlowRate && (
            flowRateAttached ? (
              <Link href={`/water/flow-rate-test`} className="s68v-sub-attached">
                <span className="s68v-sub-tick" aria-hidden="true">✓</span>
                <span className="s68v-sub-body">
                  <span className="s68v-sub-title">Flow rate test (WS-FO-206)</span>
                  <span className="s68v-sub-meta">
                    {flowRateAttached.reference} · {flowRateAttached.status}
                  </span>
                </span>
              </Link>
            ) : (
              <Link href={`/water/flow-rate-test?s68=${app.id}`} className="s68v-sub-cta">
                <span className="s68v-sub-cta-body">
                  <span className="s68v-sub-cta-title">Flow rate test (WS-FO-206)</span>
                  <span className="s68v-sub-cta-meta">
                    Required for {subtypeLabel.toLowerCase()}. We'll pre-link it
                    to this application.
                  </span>
                </span>
                <span className="s68v-sub-cta-arrow" aria-hidden="true">→</span>
              </Link>
            )
          )}

          {app.sub_forms
            .filter((s) => s.kind !== "flow_rate_test")
            .map((s) => (
              <div key={`${s.kind}-${s.id}`} className="s68v-sub-attached">
                <span className="s68v-sub-tick" aria-hidden="true">✓</span>
                <span className="s68v-sub-body">
                  <span className="s68v-sub-title">{s.title}</span>
                  <span className="s68v-sub-meta">{s.reference} · {s.status}</span>
                </span>
              </div>
            ))}

          {!needsFlowRate && app.sub_forms.length === 0 && (
            <p className="s68v-empty">
              No sub-forms are required for this activity. Council will be in
              touch about next steps.
            </p>
          )}
        </section>
      </main>
    </>
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
}
* { box-sizing: border-box; }

.s68v {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--ink);
  padding: ${fib[21]}px ${fib[13]}px ${fib[55]}px;
  font-family: inherit;
}
.s68v-head, .s68v-hero, .s68v-card {
  width: 100%; max-width: 610px; margin: 0 auto;
}
.s68v-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${fib[21]}px;
}
.s68v-back { font-size: ${fib[13]}px; color: var(--ink-2); text-decoration: none; }

.s68v-status {
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px ${fib[8]}px;
  border-radius: 999px;
  background: var(--line-soft);
  color: var(--ink-2);
}
.s68v-status-submitted { background: #DBEAFE; color: #1E40AF; }
.s68v-status-approved  { background: #ECFDF3; color: #067647; }
.s68v-status-rejected  { background: #FEF3F2; color: #B42318; }

.s68v-hero { margin-bottom: ${fib[21]}px; }
.s68v-ref {
  margin: 0 0 ${fib[5]}px;
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--accent);
}
.s68v-hero h1 {
  margin: 0 0 ${fib[5]}px;
  font-size: ${fib[21] + 4}px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.s68v-sub {
  margin: 0;
  font-size: ${fib[13] + 1}px;
  color: var(--ink-2);
  line-height: 1.4;
}

.s68v-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[8]}px;
  padding: ${fib[13]}px ${fib[13]}px ${fib[8]}px;
  margin-bottom: ${fib[13]}px;
}
.s68v-card h2 {
  margin: 0 0 ${fib[8]}px;
  font-size: ${fib[13]}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.s68v-card-head {
  display: flex; align-items: baseline; justify-content: space-between;
}
.s68v-card-meta { font-size: ${fib[13] - 1}px; color: var(--ink-3); }
.s68v-desc {
  margin: 0;
  font-size: ${fib[13] + 1}px;
  line-height: 1.5;
  white-space: pre-wrap;
  padding-bottom: ${fib[5]}px;
}

.s68v-sub-cta {
  display: flex;
  align-items: center;
  gap: ${fib[13]}px;
  padding: ${fib[13]}px;
  margin-top: ${fib[5]}px;
  margin-bottom: ${fib[5]}px;
  background: var(--ink);
  color: #fff;
  border-radius: ${fib[5] + 1}px;
  text-decoration: none;
}
.s68v-sub-cta-body { flex: 1; min-width: 0; }
.s68v-sub-cta-title {
  display: block;
  font-weight: 600;
  font-size: ${fib[13] + 2}px;
  margin-bottom: 2px;
}
.s68v-sub-cta-meta {
  display: block;
  font-size: ${fib[13] - 1}px;
  opacity: 0.85;
  line-height: 1.4;
}
.s68v-sub-cta-arrow { font-size: ${fib[21]}px; opacity: 0.9; }

.s68v-sub-attached {
  display: flex;
  align-items: center;
  gap: ${fib[13]}px;
  padding: ${fib[8]}px;
  margin-top: ${fib[5]}px;
  margin-bottom: ${fib[5]}px;
  background: var(--line-soft);
  border-radius: ${fib[5] + 1}px;
  text-decoration: none;
  color: var(--ink);
}
.s68v-sub-tick {
  display: inline-flex;
  align-items: center; justify-content: center;
  width: 24px; height: 24px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: ${fib[13]}px;
}
.s68v-sub-body { flex: 1; min-width: 0; }
.s68v-sub-title {
  display: block;
  font-weight: 600;
  font-size: ${fib[13] + 1}px;
}
.s68v-sub-meta {
  display: block;
  font-size: ${fib[13] - 1}px;
  color: var(--ink-2);
}

.s68v-empty {
  margin: 0;
  font-size: ${fib[13]}px;
  color: var(--ink-2);
  padding: ${fib[5]}px 0 ${fib[8]}px;
}
`;
