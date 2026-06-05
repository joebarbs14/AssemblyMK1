"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { PropertyListItem } from "@/lib/api";

const TYPES = [
  "Single-storey extension",
  "Two-storey extension",
  "New dwelling",
  "Shed / outbuilding",
  "Subdivision",
  "Change of use",
  "Demolition",
  "Other",
];

export function DAForm({
  token,
  properties,
}: {
  token: string;
  properties: PropertyListItem[];
}) {
  const router = useRouter();
  const [type, setType] = React.useState(TYPES[0]);
  const [description, setDescription] = React.useState("");
  const [costAud, setCostAud] = React.useState("");
  const [propertyId, setPropertyId] = React.useState<string>(
    properties[0]?.id?.toString() ?? "",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError("Please add a description (at least 10 characters).");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const cents = costAud ? Math.round(parseFloat(costAud) * 100) : null;
      const r = await fetch(`${API_BASE}/api/development`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          application_type: type,
          description: description.trim(),
          estimated_cost_cents: cents,
          property_id: propertyId ? Number(propertyId) : null,
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail ?? "Couldn't submit");
      }
      router.push("/development");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="type" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Application type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
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
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {properties.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label htmlFor="prop" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Property
            </label>
            <select
              id="prop"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
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
              <option value="">— Not linked to a property —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="desc" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Describe the proposed works
          </label>
          <textarea
            id="desc"
            required
            minLength={10}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 4m x 5m rear extension to add an open-plan living area..."
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

        <Input
          label="Estimated cost (AUD, optional)"
          type="number"
          min={0}
          step="0.01"
          placeholder="e.g. 85000"
          value={costAud}
          onChange={(e) => setCostAud(e.target.value)}
        />

        {error && (
          <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}

        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Document upload (plans, drawings) arrives in M10.x once Cloudflare R2
          is wired. For now your submission goes to council with the details above.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit DA"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
