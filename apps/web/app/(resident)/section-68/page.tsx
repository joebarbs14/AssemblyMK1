import Link from "next/link";
import { redirect } from "next/navigation";

import { api, type S68ActivityClass, type S68ListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export const metadata = { title: "Section 68 — Assembly" };

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89 } as const;

export default async function Section68LobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ part?: string; new_build?: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const { part, new_build } = await searchParams;
  const [classes, mine] = await Promise.all([
    api<S68ActivityClass[]>("/api/section-68/activity-classes", { token }),
    api<S68ListItem[]>("/api/section-68", { token }).catch(() => [] as S68ListItem[]),
  ]);

  const filtered = part
    ? classes.filter((c) => c.code === part.toUpperCase())
    : classes;

  return (
    <>
      <style>{CSS}</style>
      <main className="s68">
        <header className="s68-head">
          <Link href="/water" className="s68-back">← Water</Link>
          <span className="s68-tag">Local Government Act 1993 · s68</span>
        </header>

        <section className="s68-hero">
          <h1>Section 68 application.</h1>
          <p>
            Council approval to carry out a regulated activity — connect water,
            put a structure on a public road, install on-site sewage.
            {new_build === "1"
              ? " You've flagged this is for a new build, so we'll capture the CDC / DA reference up-front."
              : null}
          </p>
        </section>

        {mine.length > 0 && (
          <section className="s68-mine">
            <h2>Your applications</h2>
            <ul>
              {mine.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <Link href={`/section-68/${m.id}`} className="s68-mine-row">
                    <span className="s68-mine-part">Part {m.activity_class}</span>
                    <span className="s68-mine-mid">
                      <span className="s68-mine-label">{m.activity_subtype_label}</span>
                      <span className="s68-mine-sub">
                        {m.street_address}
                        {m.is_new_build ? " · New build" : ""}
                      </span>
                    </span>
                    <span className={`s68-status s68-status-${m.status}`}>{m.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="s68-classes">
          <h2>Choose the activity class</h2>
          {filtered.map((c) => (
            <article key={c.code} className="s68-class">
              <header>
                <span className="s68-class-num">Part {c.code}</span>
                <h3>{c.label}</h3>
                <p>{c.summary}</p>
              </header>
              <ul>
                {c.subtypes.map((st) => {
                  const params = new URLSearchParams({
                    part: c.code,
                    subtype: st.key,
                  });
                  if (new_build === "1") params.set("new_build", "1");
                  return (
                    <li key={st.key}>
                      <Link href={`/section-68/new?${params.toString()}`}
                            className="s68-subtype">
                        <span className="s68-subtype-label">{st.label}</span>
                        {st.sub_form_key === "flow_rate_test" && (
                          <span className="s68-subtype-tag">Flow rate test required</span>
                        )}
                        <span aria-hidden="true" className="s68-subtype-arrow">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </section>

        <footer className="s68-foot">
          Approval lasts for the period and conditions set by council. Some
          activities need an inspection or a hydraulic calculation report before
          work starts.
        </footer>
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

.s68 {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--ink);
  padding: ${fib[21]}px ${fib[13]}px ${fib[55]}px;
  font-family: inherit;
}
.s68-head,
.s68-hero,
.s68-mine,
.s68-classes,
.s68-foot {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.s68-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${fib[21]}px;
}
.s68-back { font-size: ${fib[13]}px; color: var(--ink-2); text-decoration: none; }
.s68-back:hover { color: var(--ink); }
.s68-tag {
  font-size: ${fib[8] + 2}px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.s68-hero { margin-bottom: ${fib[21]}px; }
.s68-hero h1 {
  margin: 0 0 ${fib[5]}px;
  font-size: ${fib[34]}px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.s68-hero p {
  margin: 0;
  font-size: ${fib[13] + 2}px;
  line-height: 1.45;
  color: var(--ink-2);
  max-width: 54ch;
}

.s68-mine {
  margin-bottom: ${fib[34]}px;
  padding: ${fib[13]}px ${fib[13]}px ${fib[5]}px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[8]}px;
}
.s68-mine h2 {
  margin: 0 0 ${fib[8]}px;
  font-size: ${fib[13]}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.s68-mine ul { list-style: none; padding: 0; margin: 0; }
.s68-mine li { border-top: 1px solid var(--line); }
.s68-mine li:first-child { border-top: 0; }
.s68-mine-row {
  display: flex;
  align-items: center;
  gap: ${fib[8]}px;
  padding: ${fib[8]}px 0;
  text-decoration: none;
  color: var(--ink);
}
.s68-mine-part {
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  flex: 0 0 auto;
  width: 48px;
}
.s68-mine-mid { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.s68-mine-label {
  font-size: ${fib[13] + 1}px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.s68-mine-sub {
  font-size: ${fib[13] - 1}px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s68-status {
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px ${fib[5]}px;
  border-radius: 999px;
  background: var(--line-soft);
  color: var(--ink-2);
  flex: 0 0 auto;
}
.s68-status-submitted { background: #DBEAFE; color: #1E40AF; }
.s68-status-approved  { background: #ECFDF3; color: #067647; }
.s68-status-rejected  { background: #FEF3F2; color: #B42318; }

.s68-classes h2 {
  margin: 0 0 ${fib[13]}px;
  font-size: ${fib[13]}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.s68-class {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[8]}px;
  margin-bottom: ${fib[13]}px;
  overflow: hidden;
}
.s68-class > header {
  padding: ${fib[13]}px ${fib[13]}px ${fib[8]}px;
  border-bottom: 1px solid var(--line-soft);
}
.s68-class-num {
  display: inline-block;
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: ${fib[3]}px;
}
.s68-class h3 {
  margin: 0 0 ${fib[3]}px;
  font-size: ${fib[13] + 4}px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.s68-class p {
  margin: 0;
  font-size: ${fib[13]}px;
  line-height: 1.4;
  color: var(--ink-2);
}
.s68-class ul { list-style: none; padding: 0; margin: 0; }
.s68-class li { border-top: 1px solid var(--line-soft); }
.s68-class li:first-child { border-top: 0; }
.s68-subtype {
  display: flex;
  align-items: center;
  gap: ${fib[8]}px;
  padding: ${fib[8] + 2}px ${fib[13]}px;
  text-decoration: none;
  color: var(--ink);
  font-size: ${fib[13] + 1}px;
  font-weight: 500;
  transition: background 160ms ease;
}
.s68-subtype:hover { background: var(--line-soft); }
.s68-subtype-label { flex: 1; min-width: 0; }
.s68-subtype-tag {
  font-size: ${fib[8] + 1}px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  background: #E6F4F3;
  padding: 2px ${fib[5]}px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.s68-subtype-arrow { color: var(--ink-3); flex: 0 0 auto; }

.s68-foot {
  margin-top: ${fib[21]}px;
  padding-top: ${fib[13]}px;
  border-top: 1px solid var(--line);
  font-size: ${fib[13] - 1}px;
  color: var(--ink-3);
  line-height: 1.5;
}

@media (min-width: 600px) {
  .s68 { padding: ${fib[34]}px ${fib[21]}px ${fib[55]}px; }
  .s68-hero h1 { font-size: ${fib[55] - 8}px; }
  .s68-hero p { font-size: ${fib[21] - 3}px; }
}
`;
