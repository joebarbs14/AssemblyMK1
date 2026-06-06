"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Announcement, DisasterAlertRow } from "@/lib/api";

interface Slide {
  id: string;
  kind: "alert" | "announcement";
  title: string;
  body: string;
  href: string;
  accent: string;
  tag: string;
}

const SEV_COLOR: Record<string, string> = {
  emergency: "#991b1b",
  watch: "#dc2626",
  advice: "#C9A24B",
};

export function NewsCarousel({
  announcements,
  alerts,
}: {
  announcements: Announcement[];
  alerts: DisasterAlertRow[];
}) {
  const slides: Slide[] = [
    ...alerts.map<Slide>((a) => ({
      id: `alert-${a.id}`,
      kind: "alert",
      title: a.title,
      body: a.body,
      href: "/disaster",
      accent: SEV_COLOR[a.severity] ?? "#dc2626",
      tag: `${a.severity.toUpperCase()} · ${a.source.toUpperCase()}`,
    })),
    ...announcements.slice(0, 6).map<Slide>((a) => ({
      id: `ann-${a.id}`,
      kind: "announcement",
      title: a.title,
      body: a.body_markdown.split("\n")[0].slice(0, 180),
      href: "/announcements",
      accent: "#22303C",
      tag: "ANNOUNCEMENT",
    })),
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive(i);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const next = (active + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(id);
  }, [active, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section style={{ marginBottom: "1rem" }} aria-label="News & announcements">
      <div
        ref={trackRef}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          gap: 0,
          scrollbarWidth: "none",
          borderRadius: "var(--r-lg)",
        }}
      >
        {slides.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            style={{
              minWidth: "100%",
              scrollSnapAlign: "start",
              textDecoration: "none",
              color: "#fff",
              padding: "1.25rem 1.25rem 1.5rem",
              background: `linear-gradient(135deg, ${s.accent} 0%, ${shade(s.accent, -15)} 100%)`,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              minHeight: 160,
            }}
          >
            <span style={{
              fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
              opacity: 0.85,
            }}>{s.tag}</span>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.3 }}>{s.title}</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.92, lineHeight: 1.45 }}>{s.body}</p>
            <span style={{ marginTop: "auto", fontSize: "0.8125rem", fontWeight: 600, opacity: 0.95 }}>
              Read more →
            </span>
          </Link>
        ))}
      </div>
      {slides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                trackRef.current?.scrollTo({ left: i * (trackRef.current.clientWidth), behavior: "smooth" });
              }}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                padding: 0,
                border: "none",
                borderRadius: 3,
                background: i === active ? "var(--brand)" : "var(--border)",
                transition: "width 200ms ease",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function shade(hex: string, percent: number): string {
  // Quick HSL-ish darken/lighten for the gradient end stop.
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const mix = (c: number) => Math.round((t - c) * p + c);
  const v = (mix(r) << 16) | (mix(g) << 8) | mix(b);
  return `#${v.toString(16).padStart(6, "0")}`;
}
