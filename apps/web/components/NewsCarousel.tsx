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
    <section className="nc" aria-label="News & announcements">
      <style>{`
        .nc { margin-bottom: 0.625rem; }
        .nc-track {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          border-radius: var(--r-lg);
        }
        .nc-track::-webkit-scrollbar { display: none; }
        .nc-slide {
          min-width: 100%;
          scroll-snap-align: start;
          text-decoration: none;
          color: #fff;
          padding: 0.875rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 110px;
        }
        .nc-tag {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          opacity: 0.85;
        }
        .nc-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nc-body {
          margin: 0;
          font-size: 0.8125rem;
          opacity: 0.92;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nc-more {
          margin-top: auto;
          padding-top: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          opacity: 0.95;
        }
        @media (min-width: 600px) {
          .nc { margin-bottom: 1rem; }
          .nc-slide { padding: 1.25rem 1.25rem 1.5rem; min-height: 160px; gap: 0.5rem; }
          .nc-tag { font-size: 0.65rem; }
          .nc-title { font-size: 1.125rem; -webkit-line-clamp: 3; }
          .nc-body { font-size: 0.875rem; -webkit-line-clamp: 3; }
          .nc-more { font-size: 0.8125rem; }
        }
      `}</style>
      <div ref={trackRef} className="nc-track">
        {slides.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="nc-slide"
            style={{
              background: `linear-gradient(135deg, ${s.accent} 0%, ${shade(s.accent, -15)} 100%)`,
            }}
          >
            <span className="nc-tag">{s.tag}</span>
            <h2 className="nc-title">{s.title}</h2>
            <p className="nc-body">{s.body}</p>
            <span className="nc-more">Read more →</span>
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
