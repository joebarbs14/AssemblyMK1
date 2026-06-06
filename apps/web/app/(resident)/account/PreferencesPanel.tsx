"use client";

import { useEffect, useState } from "react";

import { api, type PreferencesRow } from "@/lib/api";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "el", label: "Ελληνικά" },
];

export function PreferencesPanel({ token }: { token: string }) {
  const [prefs, setPrefs] = useState<PreferencesRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api<PreferencesRow>("/api/account/preferences", { token })
      .then(setPrefs)
      .catch(() => setPrefs({
        language: "en", high_contrast: false, dyslexia_font: false,
        larger_text: false, reduced_motion: false,
      }));
  }, [token]);

  useEffect(() => {
    if (!prefs) return;
    const root = document.documentElement;
    root.lang = prefs.language;
    root.classList.toggle("a11y-high-contrast", prefs.high_contrast);
    root.classList.toggle("a11y-dyslexia", prefs.dyslexia_font);
    root.classList.toggle("a11y-larger-text", prefs.larger_text);
    root.classList.toggle("a11y-reduced-motion", prefs.reduced_motion);
  }, [prefs]);

  async function patch(partial: Partial<PreferencesRow>) {
    if (!prefs) return;
    const optimistic = { ...prefs, ...partial };
    setPrefs(optimistic);
    setBusy(true);
    try {
      const updated = await api<PreferencesRow>("/api/account/preferences", {
        method: "PATCH", token, body: partial,
      });
      setPrefs(updated);
      setSavedAt(Date.now());
    } catch {
      // revert on failure
      setPrefs(prefs);
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) return <p style={{ margin: 0, color: "var(--text-secondary)" }}>Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
        Language
        <select
          value={prefs.language}
          onChange={(e) => patch({ language: e.target.value })}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            fontSize: "0.9375rem",
          }}
        >
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </label>

      <Toggle
        label="High contrast"
        hint="Stronger colour separation for low-vision users."
        checked={prefs.high_contrast}
        onChange={(v) => patch({ high_contrast: v })}
      />
      <Toggle
        label="Dyslexia-friendly font"
        hint="OpenDyslexic, FOSS."
        checked={prefs.dyslexia_font}
        onChange={(v) => patch({ dyslexia_font: v })}
      />
      <Toggle
        label="Larger text"
        hint="Bumps body text +15%."
        checked={prefs.larger_text}
        onChange={(v) => patch({ larger_text: v })}
      />
      <Toggle
        label="Reduced motion"
        hint="No transitions or animations."
        checked={prefs.reduced_motion}
        onChange={(v) => patch({ reduced_motion: v })}
      />
      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
        {busy ? "Saving…" : savedAt ? "Saved." : "Settings apply immediately."}
      </p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: "0.25rem" }}
      />
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{hint}</span>
      </span>
    </label>
  );
}
