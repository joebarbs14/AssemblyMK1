"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { AssemblyLogo } from "@/components/AssemblyLogo";

/* Fibonacci scale — px units, used as both spacing and type sizes. */
const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89, 144: 144 } as const;

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
      <style>{CSS}</style>
      <main className="p">
        {/* Optional background video. Drop apps/web/public/portal-bg.mp4
            into the repo and it auto-plays muted, loops, and is dimmed
            by an overlay so the form stays legible. If the file is
            missing, the page falls back to the off-white background. */}
        <video
          className="p-bg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/portal-bg-poster.jpg"
        >
          <source src="/portal-bg.mp4" type="video/mp4" />
          <source src="/portal-bg.webm" type="video/webm" />
        </video>
        <div className="p-bg-veil" aria-hidden="true" />

        {/* Top: brand + tag, on one row */}
        <header className="p-head">
          <AssemblyLogo variant="horizontal" size={fib[34]} theme="light" />
          <span className="p-tag">Staff portal</span>
        </header>

        {/* Hero — headline + lede */}
        <section className="p-hero">
          <h1>Sign in.</h1>
          <p>Use your council credentials to continue.</p>
        </section>

        {/* Form — restrained, hairline-only */}
        <form className="p-form" onSubmit={onSubmit} noValidate>
          <label className="p-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="p-field">
            <span>Password</span>
            <div className="p-pw">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="p-pw-toggle"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <p className="p-error" role="alert">{error}</p>}

          <button type="submit" className="p-submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        {/* Foot — alt link + fineprint */}
        <footer className="p-foot">
          <a href="/login" className="p-alt">Continue as resident →</a>
          <p className="p-fine">
            Unauthorised access is logged and monitored.
          </p>
        </footer>
      </main>
    </>
  );
}

const CSS = `
:root {
  --bg: #FAFAF8;
  --ink: #1A1F2E;
  --ink-2: #6B7280;
  --ink-3: #9AA0A6;
  --line: #E8E6E1;
}

* { box-sizing: border-box; }

.p {
  position: relative;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--ink);
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-content: start;
  padding: ${fib[55]}px ${fib[34]}px;
  font-family: inherit;
  overflow: hidden;
}

/* Background video — sits behind everything, dimmed by the veil.
   If the <source> files are missing, the element collapses to a
   transparent block and the off-white --bg shows through. */
.p-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  pointer-events: none;
}
.p-bg-veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(250, 250, 248, 0.82);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  pointer-events: none;
}

/* The centre column is bounded by 377 (Fibonacci) on a 610-wide stage. */
.p-head, .p-hero, .p-form, .p-foot {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 377px;
  margin: 0 auto;
}

/* === Head === */
.p-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${fib[144]}px;
}
.p-tag {
  font-size: ${fib[13]}px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--ink-2);
}

/* === Hero === */
.p-hero { margin-bottom: ${fib[55]}px; }
.p-hero h1 {
  margin: 0 0 ${fib[13]}px;
  font-size: ${fib[55]}px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.p-hero p {
  margin: 0;
  font-size: ${fib[21]}px;
  line-height: ${fib[34] / fib[21]};
  color: var(--ink-2);
  font-weight: 400;
}

/* === Form === */
.p-form {
  display: flex;
  flex-direction: column;
  gap: ${fib[21]}px;
}

.p-field {
  display: flex;
  flex-direction: column;
  gap: ${fib[8]}px;
}
.p-field > span {
  font-size: ${fib[13]}px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.p-field input {
  width: 100%;
  padding: ${fib[13]}px 0;
  font-size: ${fib[21]}px;
  font-family: inherit;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  outline: none;
  transition: border-color 160ms ease;
}
.p-field input:focus { border-bottom-color: var(--ink); }
.p-field input::placeholder { color: var(--ink-3); }
.p-field input:-webkit-autofill {
  -webkit-text-fill-color: var(--ink);
  -webkit-box-shadow: 0 0 0 1000px var(--bg) inset;
  caret-color: var(--ink);
}

.p-pw { position: relative; }
.p-pw input { padding-right: ${fib[55]}px; }
.p-pw-toggle {
  position: absolute;
  right: 0;
  bottom: ${fib[13]}px;
  background: transparent;
  border: 0;
  font-family: inherit;
  font-size: ${fib[13]}px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
  cursor: pointer;
  padding: ${fib[3]}px ${fib[5]}px;
}
.p-pw-toggle:hover { color: var(--ink); }

.p-error {
  margin: 0;
  font-size: ${fib[13]}px;
  color: #B42318;
}

.p-submit {
  align-self: flex-start;
  margin-top: ${fib[13]}px;
  padding: ${fib[13]}px ${fib[21]}px;
  font-size: ${fib[13]}px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: inherit;
  cursor: pointer;
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: ${fib[2]}px;
  transition: opacity 160ms ease, transform 120ms ease;
}
.p-submit:hover:not(:disabled) { opacity: 0.85; }
.p-submit:active:not(:disabled) { transform: translateY(1px); }
.p-submit:disabled { opacity: 0.4; cursor: not-allowed; }

/* === Foot === */
.p-foot {
  margin-top: ${fib[89]}px;
  padding-top: ${fib[21]}px;
  border-top: 1px solid var(--line);
}
.p-alt {
  display: inline-block;
  font-size: ${fib[13]}px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--ink);
  padding-bottom: ${fib[2]}px;
}
.p-alt:hover { opacity: 0.6; }
.p-fine {
  margin: ${fib[21]}px 0 0;
  font-size: ${fib[13]}px;
  color: var(--ink-3);
}

/* Mobile — keep the rhythm, tighten the top breath. */
@media (max-width: 600px) {
  .p { padding: ${fib[34]}px ${fib[21]}px; }
  .p-head { margin-bottom: ${fib[89]}px; }
  .p-hero h1 { font-size: ${fib[34]}px; }
  .p-hero p { font-size: ${fib[21]}px; }
  .p-field input { font-size: ${fib[21]}px; }
}
`;
