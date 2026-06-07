"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch("/api/session/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.detail || "Sign-in failed");
        return;
      }
      router.replace("/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <style>{KEYFRAMES}</style>
      <main className="portal-shell">
        {/* Brand panel — left on desktop, top on mobile */}
        <aside className="portal-brand">
          <div className="portal-mesh" aria-hidden="true" />
          <div className="portal-grid" aria-hidden="true" />

          <header className="portal-brand-head">
            <div className="portal-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20 L4 9 L12 4 L20 9 L20 20 Z" stroke="#C9A24B" strokeWidth="1.75"
                  strokeLinejoin="round" />
                <path d="M9 20 L9 13 L15 13 L15 20" stroke="#C9A24B" strokeWidth="1.75"
                  strokeLinejoin="round" />
              </svg>
              <span>Assembly</span>
            </div>
            <span className="portal-tag">Staff portal</span>
          </header>

          <div className="portal-brand-body">
            <h1>
              Welcome <br />
              <span className="portal-h1-accent">back.</span>
            </h1>
            <p className="portal-lede">
              The council operations workspace. Sign in to manage rates, water, reports
              and everything in between.
            </p>

            <ul className="portal-list">
              <li><Dot /> One inbox for resident reports across every channel</li>
              <li><Dot /> Strike rates, set tariffs, issue certificates</li>
              <li><Dot /> Audit-logged, role-scoped, multi-council ready</li>
            </ul>
          </div>

          <footer className="portal-brand-foot">
            <Lock />
            <span>TLS&nbsp;1.3 encrypted · all access is audit-logged</span>
          </footer>
        </aside>

        {/* Sign-in panel */}
        <section className="portal-form">
          <div className="portal-form-inner">
            <header className="portal-form-head">
              <h2>Sign in</h2>
              <p>Use your council credentials.</p>
            </header>

            <form onSubmit={onSubmit} className="portal-fields" noValidate>
              <label className="portal-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="you@council.nsw.gov.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="portal-field">
                <span>Password</span>
                <div className="portal-pw-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="portal-pw-toggle"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="portal-error" role="alert">
                  <Alert /> {error}
                </div>
              )}

              <button type="submit" className="portal-submit" disabled={pending}>
                {pending ? (
                  <>
                    <Spinner /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <Arrow />
                  </>
                )}
              </button>
            </form>

            <div className="portal-divider"><span>or</span></div>

            <a href="/login" className="portal-alt-link">
              Continue as resident
              <Arrow />
            </a>

            <p className="portal-fineprint">
              Unauthorised access is logged and monitored. By signing in you agree to the
              council&apos;s acceptable use policy.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

function Dot() {
  return (
    <span className="portal-dot" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#C9A24B" strokeWidth="1.5" />
        <path d="M4.5 7 L6.25 8.5 L9.5 5.5" stroke="#C9A24B" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor"
        strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a16 16 0 0 1-3.2 3.7"
        stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.7 6.7A16 16 0 0 0 2 12s4 6 10 6c1.5 0 2.9-.3 4.1-.8"
        stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Alert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ animation: "portal-spin 800ms linear infinite" }} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" />
    </svg>
  );
}

const KEYFRAMES = `
@keyframes portal-mesh { 0% { transform: translate(0, 0); } 50% { transform: translate(-2%, -1.5%); } 100% { transform: translate(0, 0); } }
@keyframes portal-spin { to { transform: rotate(360deg); } }
@keyframes portal-card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.portal-shell { min-height: 100dvh; display: grid; grid-template-columns: 1.05fr 1fr;
  background: #f6f6f3; color: #22303C; font-family: inherit; }
@media (max-width: 900px) { .portal-shell { grid-template-columns: 1fr; } }

.portal-brand { position: relative; overflow: hidden; padding: 2.25rem 2.5rem; color: #fff;
  background: linear-gradient(160deg, #0c1722 0%, #14222e 45%, #1d3145 100%);
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 100dvh; }
@media (max-width: 900px) { .portal-brand { min-height: auto; padding: 1.75rem 1.5rem; } }

.portal-mesh { position: absolute; inset: -8%; pointer-events: none;
  background:
    radial-gradient(40rem 32rem at 8% 18%, rgba(201, 162, 75, 0.18), transparent 60%),
    radial-gradient(36rem 26rem at 100% 75%, rgba(82, 130, 195, 0.18), transparent 60%),
    radial-gradient(28rem 18rem at 70% 10%, rgba(201, 162, 75, 0.07), transparent 60%);
  animation: portal-mesh 18s ease-in-out infinite; filter: saturate(110%); }

.portal-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.06;
  background-image: linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: linear-gradient(180deg, #000 50%, transparent); }

.portal-brand-head, .portal-brand-body, .portal-brand-foot { position: relative; z-index: 1; }
.portal-brand-head { display: flex; align-items: center; justify-content: space-between;
  font-size: 0.875rem; }
.portal-mark { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700;
  letter-spacing: 0.02em; }
.portal-tag { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: #C9A24B; padding: 0.25rem 0.625rem; border: 1px solid rgba(201,162,75,0.35);
  border-radius: 999px; }

.portal-brand-body h1 { font-size: clamp(2.25rem, 4.5vw, 3.5rem); font-weight: 600;
  margin: 0 0 1rem; line-height: 1.05; letter-spacing: -0.02em; }
.portal-h1-accent { color: #C9A24B; }
.portal-lede { font-size: 1rem; line-height: 1.5; max-width: 30rem;
  opacity: 0.82; margin: 0 0 2rem; }
.portal-list { list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 0.625rem; max-width: 30rem;
  font-size: 0.9375rem; }
.portal-list li { display: flex; align-items: center; gap: 0.625rem; opacity: 0.92; }
.portal-dot { display: inline-flex; flex-shrink: 0; }

.portal-brand-foot { display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.75rem; opacity: 0.55; }
@media (max-width: 900px) { .portal-brand-foot { display: none; } }

.portal-form { display: flex; align-items: center; justify-content: center;
  padding: 2.25rem 1.5rem; background: #f6f6f3; }
.portal-form-inner { width: 100%; max-width: 26rem;
  animation: portal-card-in 360ms cubic-bezier(.16,.84,.44,1) both; }
.portal-form-head h2 { margin: 0 0 0.25rem; font-size: 1.75rem; font-weight: 600;
  letter-spacing: -0.01em; }
.portal-form-head p { margin: 0 0 1.5rem; color: #5b6a78; font-size: 0.9375rem; }

.portal-fields { display: flex; flex-direction: column; gap: 0.875rem; }
.portal-field { display: flex; flex-direction: column; gap: 0.375rem; }
.portal-field > span { font-size: 0.8125rem; font-weight: 600; color: #3a4856; }
.portal-field input { width: 100%; padding: 0.75rem 0.875rem; font-size: 0.9375rem;
  font-family: inherit; background: #fff; color: #22303C;
  border: 1px solid #e2e4e1; border-radius: 10px;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
  outline: none; }
.portal-field input::placeholder { color: #a5aeb6; }
.portal-field input:focus { border-color: #22303C; box-shadow: 0 0 0 4px rgba(34,48,60,0.08); }

.portal-pw-wrap { position: relative; }
.portal-pw-wrap input { padding-right: 2.75rem; }
.portal-pw-toggle { position: absolute; top: 50%; right: 0.625rem; transform: translateY(-50%);
  background: transparent; border: 0; color: #6c7884; cursor: pointer;
  padding: 0.375rem; border-radius: 6px;
  transition: color 140ms ease, background 140ms ease; }
.portal-pw-toggle:hover { color: #22303C; background: #efeee9; }

.portal-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 0.75rem;
  background: #fef3f2; color: #b42318; border: 1px solid #fecdca;
  border-radius: 10px; font-size: 0.875rem; }

.portal-submit { display: inline-flex; align-items: center; justify-content: center;
  gap: 0.5rem; padding: 0.875rem 1.25rem; font-size: 0.9375rem; font-weight: 600;
  font-family: inherit; cursor: pointer;
  background: linear-gradient(180deg, #2a3a4a 0%, #1a2734 100%);
  color: #fff; border: 0; border-radius: 10px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 6px 20px rgba(20,32,44,0.18);
  transition: transform 120ms ease, box-shadow 160ms ease, opacity 120ms ease; }
.portal-submit:hover:not(:disabled) { transform: translateY(-1px);
  box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 26px rgba(20,32,44,0.24); }
.portal-submit:active:not(:disabled) { transform: translateY(0); }
.portal-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.portal-divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0 1rem;
  color: #a5aeb6; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
.portal-divider::before, .portal-divider::after { content: ""; flex: 1;
  height: 1px; background: #e2e4e1; }

.portal-alt-link { display: inline-flex; align-items: center; justify-content: center;
  gap: 0.5rem; width: 100%; padding: 0.75rem 1rem;
  background: transparent; color: #22303C; font-weight: 600; font-size: 0.875rem;
  text-decoration: none; border: 1px solid #e2e4e1; border-radius: 10px;
  transition: background 140ms ease, border-color 140ms ease; }
.portal-alt-link:hover { background: #efeee9; border-color: #d4d6d2; }

.portal-fineprint { margin: 1.25rem 0 0; font-size: 0.7rem; line-height: 1.5;
  text-align: center; color: #6c7884; max-width: 24rem; margin-left: auto; margin-right: auto; }
`;
