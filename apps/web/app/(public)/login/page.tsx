"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DEFAULT_COUNCIL_SLUG } from "@/lib/env";

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89, 144: 144 } as const;

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("magic");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
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
      <main className="stage">
        <div className="card">
          {/* Looping logo video. Drop apps/web/public/logo-loop.mp4 (and
              optional .webm + logo-loop-poster.png) to activate. */}
          <div className="brand">
            <video
              className="brand-video"
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
            <span className="brand-word">Assembly</span>
            <span className="brand-tagline">One Platform. Every Service.</span>
          </div>

          <h1 className="title">Sign in</h1>
          <p className="subtitle">Use the email registered with your council.</p>

          <div className="modes" role="tablist" aria-label="Sign-in method">
            {([
              { id: "magic", label: "Email link" },
              { id: "password", label: "Password" },
            ] as const).map((m) => (
              <button
                key={m.id}
                role="tab"
                type="button"
                aria-selected={mode === m.id}
                className={`mode${mode === m.id ? " is-active" : ""}`}
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

          <form className="form" onSubmit={onSubmit} noValidate>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {mode === "magic" && (
                <span className="hint">We'll send a one-time sign-in link.</span>
              )}
            </label>

            {mode === "password" && (
              <label className="field">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}

            <button type="submit" className="submit" disabled={pending}>
              {pending ? "Working…" : mode === "magic" ? "Send sign-in link" : "Sign in"}
            </button>

            {error && <p className="banner banner-error" role="alert">{error}</p>}
            {info && <p className="banner banner-info" role="status">{info}</p>}
          </form>

          <div className="divider">
            <span className="divider-line" aria-hidden="true" />
            <span className="divider-label">Council staff</span>
            <span className="divider-line" aria-hidden="true" />
          </div>

          <div className="sso">
            <button type="button" className="sso-btn" disabled aria-disabled="true"
                    title="Microsoft Entra SSO arrives in M2.x">
              <span className="sso-mark" style={{ background: "#f25022" }} aria-hidden="true" />
              <span>Continue with Microsoft</span>
              <span className="sso-badge">Soon</span>
            </button>
            <button type="button" className="sso-btn" disabled aria-disabled="true"
                    title="Google Workspace SSO arrives in M2.x">
              <span className="sso-mark" style={{ background: "#ea4335" }} aria-hidden="true" />
              <span>Continue with Google</span>
              <span className="sso-badge">Soon</span>
            </button>
          </div>

          <p className="foot-line">
            New here? <a href="/signup">Create an account</a>
          </p>
          <p className="foot-line foot-line-muted">
            Council staff? <a href="/portal" className="foot-strong">Sign in to the staff portal →</a>
          </p>
        </div>
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
  --teal: #3FA8A4;
  --danger-bg: #fef3f2;
  --danger-line: #fecdca;
  --danger-ink: #B42318;
  --ok-bg: #ecfdf3;
  --ok-line: #abefc6;
  --ok-ink: #067647;
}

* { box-sizing: border-box; }

.stage {
  min-height: 100dvh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${fib[34]}px ${fib[21]}px;
  font-family: inherit;
  color: var(--ink);
}

.card {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[13]}px;
  padding: ${fib[34]}px ${fib[34]}px ${fib[34]}px;
  box-shadow: 0 1px 2px rgba(26, 31, 46, 0.04);
}

/* === Brand block === */
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: ${fib[21]}px;
}
.brand-video {
  width: ${fib[89]}px;
  height: ${fib[89]}px;
  object-fit: contain;
  background: transparent;
  display: block;
}
.brand-word {
  margin-top: ${fib[8]}px;
  font-size: ${fib[21]}px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1;
}
.brand-tagline {
  margin-top: ${fib[5]}px;
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--teal);
}

.title {
  margin: 0 0 ${fib[5]}px;
  text-align: center;
  font-size: ${fib[21]}px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.subtitle {
  margin: 0 0 ${fib[21]}px;
  text-align: center;
  color: var(--ink-2);
  font-size: ${fib[13] + 1}px;
  line-height: 1.5;
}

/* === Mode pill toggle === */
.modes {
  display: flex;
  background: var(--line-soft);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
  margin-bottom: ${fib[21]}px;
}
.mode {
  flex: 1;
  min-height: 36px;
  padding: ${fib[5]}px ${fib[13]}px;
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
.mode.is-active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(26, 31, 46, 0.06), 0 0 0 1px var(--line);
}

/* === Form === */
.form {
  display: flex;
  flex-direction: column;
  gap: ${fib[13]}px;
}
.field { display: flex; flex-direction: column; gap: ${fib[5]}px; }
.field-label {
  font-size: ${fib[13]}px;
  font-weight: 500;
  color: var(--ink);
}
.field input {
  width: 100%;
  padding: ${fib[8] + 2}px ${fib[13]}px;
  font-size: ${fib[13] + 1}px;
  font-family: inherit;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[5] + 1}px;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.field input::placeholder { color: var(--ink-3); }
.field input:focus {
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(26, 31, 46, 0.08);
}
.field input:-webkit-autofill {
  -webkit-text-fill-color: var(--ink);
  -webkit-box-shadow: 0 0 0 1000px var(--surface) inset, 0 0 0 1px var(--line);
  caret-color: var(--ink);
}
.hint {
  font-size: ${fib[13] - 1}px;
  color: var(--ink-2);
}

.submit {
  margin-top: ${fib[5]}px;
  width: 100%;
  min-height: 44px;
  padding: ${fib[8]}px ${fib[21]}px;
  font-size: ${fib[13] + 1}px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: ${fib[5] + 1}px;
  transition: opacity 160ms ease, transform 120ms ease;
}
.submit:hover:not(:disabled) { opacity: 0.9; }
.submit:active:not(:disabled) { transform: translateY(1px); }
.submit:disabled { opacity: 0.5; cursor: not-allowed; }

.banner {
  margin: 0;
  padding: ${fib[8]}px ${fib[13]}px;
  border-radius: ${fib[5] + 1}px;
  font-size: ${fib[13]}px;
  border: 1px solid;
}
.banner-error { background: var(--danger-bg); border-color: var(--danger-line); color: var(--danger-ink); }
.banner-info  { background: var(--ok-bg);     border-color: var(--ok-line);     color: var(--ok-ink); }

/* === Divider === */
.divider {
  display: flex;
  align-items: center;
  gap: ${fib[13]}px;
  margin: ${fib[21]}px 0 ${fib[13]}px;
  color: var(--ink-2);
  font-size: ${fib[13] - 1}px;
}
.divider-line { flex: 1; height: 1px; background: var(--line); }

/* === SSO === */
.sso { display: flex; flex-direction: column; gap: ${fib[8]}px; }
.sso-btn {
  display: flex;
  align-items: center;
  gap: ${fib[8]}px;
  width: 100%;
  min-height: 44px;
  padding: ${fib[8]}px ${fib[13]}px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: ${fib[5] + 1}px;
  color: var(--ink);
  font-size: ${fib[13] + 1}px;
  font-weight: 500;
  font-family: inherit;
  cursor: not-allowed;
  opacity: 0.75;
  text-align: left;
}
.sso-mark { display: inline-block; width: 16px; height: 16px; border-radius: 3px; flex: 0 0 auto; }
.sso-badge {
  margin-left: auto;
  font-size: ${fib[8] + 2}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: var(--line-soft);
  padding: 2px 6px;
  border-radius: 999px;
}

/* === Foot === */
.foot-line {
  margin: ${fib[21]}px 0 0;
  text-align: center;
  font-size: ${fib[13] + 1}px;
  color: var(--ink);
}
.foot-line a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
.foot-line-muted {
  margin-top: ${fib[8]}px;
  color: var(--ink-2);
  font-size: ${fib[13]}px;
}
.foot-strong { font-weight: 600; }

@media (max-width: 480px) {
  .card { padding: ${fib[21]}px; border-radius: ${fib[8]}px; }
  .brand-video { width: ${fib[55]}px; height: ${fib[55]}px; }
  .brand-word { font-size: ${fib[21] - 2}px; }
}
`;
