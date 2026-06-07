"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { AssemblyLogo } from "@/components/AssemblyLogo";

const fib = { 2: 2, 3: 3, 5: 5, 8: 8, 13: 13, 21: 21, 34: 34, 55: 55, 89: 89, 144: 144 } as const;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 12;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Please use at least 12 characters.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "register", name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Sign-up failed");
      }
      router.push("/");
      router.refresh();
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

        <header className="p-head">
          <AssemblyLogo variant="horizontal" size={fib[34]} theme="light" />
          <span className="p-tag">Create account</span>
        </header>

        <section className="p-hero">
          <h1>Get started.</h1>
          <p>Takes about thirty seconds.</p>
        </section>

        <form className="p-form" onSubmit={onSubmit} noValidate>
          <label className="p-field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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

          <label className="p-field">
            <span>Password</span>
            <div className="p-pw">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
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
            <span className="p-hint">
              {tooShort
                ? `${12 - password.length} more character${12 - password.length === 1 ? "" : "s"} needed.`
                : "At least 12 characters."}
            </span>
          </label>

          {error && <p className="p-error" role="alert">{error}</p>}

          <button type="submit" className="p-submit" disabled={pending}>
            {pending ? "Creating…" : "Create account →"}
          </button>

          <p className="p-fine">
            By creating an account you agree to our terms and the Privacy
            Policy. Your data stays inside your council.
          </p>
        </form>

        <footer className="p-foot">
          <a href="/login" className="p-alt">Already have an account? Sign in →</a>
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
  padding: ${fib[21]}px ${fib[13]}px;
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

.p-head, .p-hero, .p-form, .p-foot {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 377px;
  margin: 0 auto;
}

.p-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${fib[34]}px;
}
.p-tag {
  font-size: ${fib[13] - 1}px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.p-hero { margin-bottom: ${fib[21]}px; }
.p-hero h1 {
  margin: 0 0 ${fib[5]}px;
  font-size: ${fib[34]}px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.p-hero p {
  margin: 0;
  font-size: ${fib[13] + 2}px;
  line-height: 1.4;
  color: var(--ink-2);
  font-weight: 400;
}

.p-form {
  display: flex;
  flex-direction: column;
  gap: ${fib[13]}px;
}
.p-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.p-field > span {
  font-size: ${fib[8] + 2}px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.p-hint {
  font-size: ${fib[13] - 2}px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink-3);
}
.p-field input {
  width: 100%;
  padding: ${fib[8]}px 0;
  font-size: ${fib[13] + 3}px;
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
  bottom: ${fib[8]}px;
  background: transparent;
  border: 0;
  font-family: inherit;
  font-size: ${fib[8] + 2}px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
  cursor: pointer;
  padding: ${fib[3]}px ${fib[5]}px;
}
.p-pw-toggle:hover { color: var(--ink); }

.p-error {
  margin: 0;
  font-size: ${fib[13] - 1}px;
  color: #B42318;
}

.p-submit {
  align-self: flex-start;
  margin-top: ${fib[8]}px;
  padding: ${fib[8] + 2}px ${fib[21]}px;
  font-size: ${fib[13] - 1}px;
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

.p-fine {
  margin: ${fib[8]}px 0 0;
  font-size: ${fib[13] - 2}px;
  color: var(--ink-3);
  line-height: 1.45;
}

.p-foot {
  margin-top: ${fib[21]}px;
  padding-top: ${fib[13]}px;
  border-top: 1px solid var(--line);
}
.p-alt {
  display: inline-block;
  font-size: ${fib[13] - 1}px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--ink);
  padding-bottom: ${fib[2]}px;
}
.p-alt:hover { opacity: 0.6; }

@media (min-width: 600px) {
  .p { padding: ${fib[55]}px ${fib[34]}px; }
  .p-head { margin-bottom: ${fib[89]}px; }
  .p-hero { margin-bottom: ${fib[55]}px; }
  .p-hero h1 { font-size: ${fib[55]}px; margin-bottom: ${fib[13]}px; }
  .p-hero p { font-size: ${fib[21]}px; }
  .p-form { gap: ${fib[21]}px; }
  .p-field { gap: ${fib[8]}px; }
  .p-field > span { font-size: ${fib[13]}px; letter-spacing: 0.04em; }
  .p-hint { font-size: ${fib[13]}px; }
  .p-field input { padding: ${fib[13]}px 0; font-size: ${fib[21]}px; }
  .p-pw-toggle { bottom: ${fib[13]}px; font-size: ${fib[13]}px; }
  .p-submit { margin-top: ${fib[13]}px; padding: ${fib[13]}px ${fib[21]}px; font-size: ${fib[13]}px; }
  .p-fine { font-size: ${fib[13]}px; margin-top: ${fib[13]}px; }
  .p-foot { margin-top: ${fib[89]}px; padding-top: ${fib[21]}px; }
  .p-alt { font-size: ${fib[13]}px; }
}
`;
