"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { AssemblyLogo } from "@/components/AssemblyLogo";
import { DEFAULT_COUNCIL_SLUG } from "@/lib/env";

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89, 144: 144 } as const;

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("magic");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      if (mode === "password") {
        const res = await fetch("/api/session/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "password", email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail ?? "Sign in failed");
        }
        router.push("/");
        router.refresh();
      } else {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/auth/magic-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
          },
          body: JSON.stringify({ email }),
        });
        if (!res.ok && res.status !== 202) {
          throw new Error("We couldn't send a link right now. Please try again.");
        }
        setInfo(
          `If ${email} is registered, we've sent a sign-in link. It expires in 15 minutes.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <main className="p">
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

        {mode === "magic" ? (
          <section className="p-brand">
            {/* Looping logo. Drop apps/web/public/logo-loop.mp4 to enable. */}
            <video
              className="p-brand-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/logo-loop-poster.png"
              aria-label="Assembly"
            >
              <source src="/logo-loop.mp4" type="video/mp4" />
              <source src="/logo-loop.webm" type="video/webm" />
            </video>
            <span className="p-brand-tagline">One Platform. Every Service.</span>
            <h1 className="p-brand-h1">Sign in.</h1>
            <p className="p-brand-lede">Use the email registered with your council.</p>
          </section>
        ) : (
          <>
            <header className="p-head">
              <AssemblyLogo variant="horizontal" size={fib[34]} theme="light" />
              <span className="p-tag">Resident</span>
            </header>
            <section className="p-hero">
              <h1>Sign in.</h1>
              <p>Use the email registered with your council.</p>
            </section>
          </>
        )}

        <div className="p-modes" role="tablist" aria-label="Sign-in method">
          {([
            { id: "magic", label: "Email link" },
            { id: "password", label: "Password" },
          ] as const).map((m) => (
            <button
              key={m.id}
              role="tab"
              type="button"
              aria-selected={mode === m.id}
              className={`p-mode${mode === m.id ? " is-active" : ""}`}
              onClick={() => {
                setMode(m.id);
                setError(null);
                setInfo(null);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form className="p-form" onSubmit={onSubmit} noValidate>
          <label className="p-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {mode === "password" && (
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
          )}

          {error && <p className="p-error" role="alert">{error}</p>}
          {info && <p className="p-info" role="status">{info}</p>}

          <button type="submit" className="p-submit" disabled={pending}>
            {pending ? "Working…" : mode === "magic" ? "Send sign-in link →" : "Sign in →"}
          </button>
        </form>

        <footer className="p-foot">
          <a href="/portal" className="p-alt">Council staff sign in →</a>
          <p className="p-fine">
            New here? <a href="/signup">Create an account</a>.
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

.p-head, .p-hero, .p-brand, .p-modes, .p-form, .p-foot {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 377px;
  margin: 0 auto;
}

/* === Magic-mode centred brand block === */
.p-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: ${fib[34]}px;
}
.p-brand-video {
  width: ${fib[144]}px;
  height: ${fib[144]}px;
  object-fit: contain;
  background: transparent;
  display: block;
}
.p-brand-tagline {
  margin-top: ${fib[8]}px;
  font-size: ${fib[13]}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #3FA8A4;
}
.p-brand-h1 {
  margin: ${fib[34]}px 0 ${fib[8]}px;
  font-size: ${fib[55]}px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.p-brand-lede {
  margin: 0;
  font-size: ${fib[21]}px;
  line-height: ${fib[34] / fib[21]};
  color: var(--ink-2);
  font-weight: 400;
}

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

.p-hero { margin-bottom: ${fib[34]}px; }
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

.p-modes {
  display: flex;
  gap: ${fib[21]}px;
  margin-bottom: ${fib[21]}px;
  border-bottom: 1px solid var(--line);
}
.p-mode {
  background: transparent;
  border: 0;
  font-family: inherit;
  font-size: ${fib[13]}px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  padding: ${fib[8]}px 0;
  margin-bottom: -1px;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
}
.p-mode:hover { color: var(--ink-2); }
.p-mode.is-active {
  color: var(--ink);
  border-bottom-color: var(--ink);
}

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
.p-info {
  margin: 0;
  font-size: ${fib[13]}px;
  color: #067647;
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
.p-fine a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }

@media (max-width: 600px) {
  .p { padding: ${fib[34]}px ${fib[21]}px; }
  .p-head { margin-bottom: ${fib[89]}px; }
  .p-hero h1 { font-size: ${fib[34]}px; }
  .p-hero p { font-size: ${fib[21]}px; }
  .p-field input { font-size: ${fib[21]}px; }
  .p-brand-video { width: ${fib[89]}px; height: ${fib[89]}px; }
  .p-brand-h1 { font-size: ${fib[34]}px; }
}
`;
