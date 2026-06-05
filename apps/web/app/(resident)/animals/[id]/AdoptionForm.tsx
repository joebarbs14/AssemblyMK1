"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

export function AdoptionForm({
  animalId,
  animalName,
  token,
}: {
  animalId: number;
  animalName: string;
  token: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [why, setWhy] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [homeType, setHomeType] = React.useState<"" | "house" | "apartment" | "other">("");
  const [hasOtherPets, setHasOtherPets] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (why.trim().length < 10) {
      setError("Tell council a bit more — at least 10 characters.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/animals/${animalId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          phone: phone || null,
          has_other_pets: hasOtherPets,
          home_type: homeType || null,
          why_this_animal: why.trim(),
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't submit application");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        style={{
          padding: "1rem 1.25rem",
          background: "var(--success-soft)",
          border: "1px solid var(--success)",
          borderRadius: "var(--r-md)",
          color: "var(--success)",
          fontSize: "0.9375rem",
        }}
      >
        ✓ Your application for <strong>{animalName}</strong> is in. Council will be in touch.
      </div>
    );
  }

  if (!open) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => setOpen(true)}>Apply to adopt {animalName}</Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{
        padding: "1rem 1.25rem",
        background: "var(--surface-muted)",
        borderRadius: "var(--r-md)",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
        Apply to adopt {animalName}
      </h3>
      <Input
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="home" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          What's your home like?
        </label>
        <select
          id="home"
          value={homeType}
          onChange={(e) => setHomeType(e.target.value as typeof homeType)}
          style={{
            padding: "0.625rem 0.75rem",
            fontSize: "1rem",
            fontFamily: "inherit",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            minHeight: 44,
          }}
        >
          <option value="">— Choose —</option>
          <option value="house">House with yard</option>
          <option value="apartment">Apartment / unit</option>
          <option value="other">Other</option>
        </select>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9375rem" }}>
        <input
          type="checkbox"
          checked={hasOtherPets}
          onChange={(e) => setHasOtherPets(e.target.checked)}
        />
        I have other pets at home
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="why" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          Why this animal? <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(required)</span>
        </label>
        <textarea
          id="why"
          required
          minLength={10}
          rows={4}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          style={{
            padding: "0.625rem 0.75rem",
            fontSize: "0.9375rem",
            fontFamily: "inherit",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            resize: "vertical",
          }}
        />
      </div>
      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
