"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";
import type { Category, ReportDetail } from "@/lib/api";

type Step = "category" | "details" | "photo" | "location";

interface UploadedPhoto {
  key: string;
  previewUrl: string;
  mime: string;
}

export function NewReportForm({ categories, token }: { categories: Category[]; token: string }) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("category");
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [lat, setLat] = React.useState<number | null>(null);
  const [lng, setLng] = React.useState<number | null>(null);
  const [address, setAddress] = React.useState("");
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [geoStatus, setGeoStatus] = React.useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selected = categories.find((c) => c.id === categoryId) ?? null;

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const presignRes = await fetch(`${API_BASE}/api/reports/attachments/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({ mime: file.type || "image/jpeg" }),
      });
      if (!presignRes.ok) throw new Error("Couldn't prepare upload");
      const { key, url, headers_json } = (await presignRes.json()) as {
        key: string;
        url: string;
        headers_json: string;
      };
      const putUrl = url.startsWith("/") ? `${API_BASE}${url}` : url;
      const putHeaders = JSON.parse(headers_json) as Record<string, string>;
      const put = await fetch(putUrl, { method: "PUT", headers: putHeaders, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      setPhotos((p) => [
        ...p,
        { key, previewUrl: URL.createObjectURL(file), mime: file.type || "image/jpeg" },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(key: string) {
    setPhotos((p) => p.filter((x) => x.key !== key));
  }

  function pickCategory(c: Category) {
    setCategoryId(c.id);
    setTitle("");
    setStep("details");
  }

  function detectLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submit() {
    if (!categoryId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify({
          category_id: categoryId,
          title,
          description,
          lat,
          lng,
          address_text: address || null,
          attachment_keys: photos.map((p) => p.key),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail ?? "Couldn't submit");
      }
      const out = (await res.json()) as ReportDetail;
      router.push(`/reports/${out.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit");
    } finally {
      setPending(false);
    }
  }

  if (step === "category") {
    return (
      <Card>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>What's the issue?</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>Pick the closest match.</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {categories.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Council hasn't published categories yet. Try again soon.
            </p>
          ) : (
            categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pickCategory(c)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "0.875rem 1rem",
                    fontSize: "1rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{c.label}</span>
                  {c.requires_photo && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "0.6875rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Photo required
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </Card>
    );
  }

  if (step === "details") {
    return (
      <Card>
        <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
          {selected?.label}
        </p>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Tell us what's happening</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <Input
            label="Short summary"
            placeholder="e.g. Pothole on Main St near the bus stop"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              htmlFor="description"
              style={{ fontSize: "0.875rem", fontWeight: 500 }}
            >
              Details (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                padding: "0.625rem 0.75rem",
                fontSize: "1rem",
                fontFamily: "inherit",
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" type="button" onClick={() => setStep("category")}>
              Back
            </Button>
            <Button
              type="button"
              disabled={title.trim().length < 3}
              onClick={() => setStep("photo")}
              style={{ marginLeft: "auto" }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (step === "photo") {
    const required = !!selected?.requires_photo;
    return (
      <Card>
        <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
          {selected?.label}
        </p>
        <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>
          Add a photo {required ? "" : "(optional)"}
        </h2>
        <p style={{ marginTop: 0, color: "var(--text-secondary)" }}>
          A clear photo helps council triage faster.
        </p>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await uploadFile(f);
            e.target.value = "";
          }}
          style={{ display: "block", margin: "0.5rem 0 1rem" }}
        />

        {photos.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 1rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: 8,
            }}
          >
            {photos.map((p) => (
              <li
                key={p.key}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "var(--r-md)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt="upload preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(p.key)}
                  aria-label="Remove photo"
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 28,
                    height: 28,
                    border: "none",
                    borderRadius: "var(--r-full)",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploading && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
            Uploading…
          </p>
        )}
        {error && (
          <p role="alert" style={{ color: "var(--danger)", margin: 0, fontSize: "0.875rem" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
          <Button variant="ghost" type="button" onClick={() => setStep("details")}>
            Back
          </Button>
          <Button
            type="button"
            disabled={uploading || (required && photos.length === 0)}
            onClick={() => setStep("location")}
            style={{ marginLeft: "auto" }}
          >
            Next
          </Button>
        </div>
      </Card>
    );
  }

  // Step: location
  return (
    <Card>
      <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
        {selected?.label}
      </p>
      <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>Where is it?</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <Button
          variant="secondary"
          type="button"
          onClick={detectLocation}
          disabled={geoStatus === "loading"}
        >
          {geoStatus === "ok"
            ? `Location captured (±10m)`
            : geoStatus === "loading"
              ? "Finding you…"
              : "Use my current location"}
        </Button>
        {geoStatus === "denied" && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
            Location not available. Enter an address below instead.
          </p>
        )}
        <Input
          label="Address or landmark (optional)"
          placeholder="e.g. Corner of Main & George St"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        {(lat != null || address) && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
            {lat != null ? `${lat.toFixed(5)}, ${lng?.toFixed(5)}` : address}
          </p>
        )}
        {error && (
          <p role="alert" style={{ color: "var(--danger)", margin: 0, fontSize: "0.875rem" }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" type="button" onClick={() => setStep("photo")}>
            Back
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending}
            style={{ marginLeft: "auto" }}
          >
            {pending ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
