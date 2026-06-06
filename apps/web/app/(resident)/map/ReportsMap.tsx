"use client";

import * as React from "react";

import type { MapReportRow } from "@/lib/api";

// FOSS stack: MapLibre GL JS (BSD-3) loaded from a CDN, OpenStreetMap
// raster tiles via a free public tile server. No paid keys required.
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.0/dist/maplibre-gl.css";
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.0/dist/maplibre-gl.js";

declare global {
  interface Window {
    maplibregl?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

const STATUS_COLOUR: Record<string, string> = {
  new: "#2c6da8",
  triaging: "#2c6da8",
  assigned: "#22303c",
  in_progress: "#c9a24b",
  awaiting_resident: "#c9a24b",
  resolved: "#067647",
};

export function ReportsMap({ initialPoints }: { initialPoints: MapReportRow[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [empty] = React.useState(initialPoints.length === 0);

  React.useEffect(() => {
    if (!ref.current || initialPoints.length === 0) return;
    let cancelled = false;
    (async () => {
      loadCss(MAPLIBRE_CSS);
      await loadScript(MAPLIBRE_JS);
      if (cancelled || !ref.current || !window.maplibregl) return;

      const lats = initialPoints.map((p) => p.lat);
      const lngs = initialPoints.map((p) => p.lng);
      const center: [number, number] = [
        lngs.reduce((a, b) => a + b, 0) / lngs.length,
        lats.reduce((a, b) => a + b, 0) / lats.length,
      ];

      const map = new window.maplibregl.Map({
        container: ref.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center,
        zoom: 12,
      });
      map.addControl(new window.maplibregl.NavigationControl(), "top-right");

      for (const p of initialPoints) {
        const el = document.createElement("div");
        const c = STATUS_COLOUR[p.status] ?? "#22303c";
        el.style.cssText = `
          width: 18px; height: 18px; border-radius: 50%;
          background: ${c}; border: 3px solid #FBFBF9;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3); cursor: pointer;
        `;
        const popup = new window.maplibregl.Popup({ offset: 12 }).setHTML(
          `<div style="font-family: -apple-system, system-ui, sans-serif; font-size: 13px;">
             <div style="font-weight:600; margin-bottom:4px;">${escape(p.title)}</div>
             <div style="color:#5a6975; font-size:11px;">${escape(p.category_label)} · ${escape(p.status)}</div>
           </div>`,
        );
        new window.maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(popup)
          .addTo(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPoints]);

  if (empty) {
    return (
      <div
        style={{
          padding: "2rem 1.5rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        No open reports with map locations yet. Submit one with location enabled to see it here.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: 480,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    />
  );
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
