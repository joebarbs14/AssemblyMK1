import Link from "next/link";
import { redirect } from "next/navigation";

import { NewsCarousel } from "@/components/NewsCarousel";
import { ServiceGrid } from "@/components/ServiceGrid";
import { Card } from "@/components/ui/Card";
import {
  api,
  type Announcement,
  type DisasterAlertRow,
  type Me,
  type PropertyListItem,
  type ReportListItem,
} from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { TryDemoPanel } from "./TryDemoPanel";

export default async function Home() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let me: Me;
  try {
    me = await api<Me>("/api/auth/me", { token });
  } catch {
    redirect("/login");
  }

  if (me.role === "staff" || me.role === "admin") {
    redirect("/staff");
  }

  const [reports, properties, announcements, alerts] = await Promise.all([
    api<ReportListItem[]>("/api/reports", { token }).catch(() => [] as ReportListItem[]),
    api<PropertyListItem[]>("/api/rates/properties", { token }).catch(() => [] as PropertyListItem[]),
    api<Announcement[]>("/api/announcements", { token }).catch(() => [] as Announcement[]),
    api<DisasterAlertRow[]>("/api/disaster/alerts", { token }).catch(() => [] as DisasterAlertRow[]),
  ]);

  const isEmpty = reports.length === 0 && properties.length === 0;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "1rem 1.25rem 6rem" }}>
      <CouncilHeader me={me} />

      {/* 1. News & announcements carousel */}
      <NewsCarousel announcements={announcements} alerts={alerts} />

      {/* 2. Report something — primary action */}
      <Link
        href="/reports/new"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.875rem",
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem",
          background: me.council.brand_color,
          color: "#fff",
          borderRadius: "var(--r-lg)",
          textDecoration: "none",
          boxShadow: "var(--e1)",
        }}
      >
        <span aria-hidden="true" style={{
          width: 44, height: 44, borderRadius: "var(--r-md)",
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.0625rem" }}>Report something</p>
          <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>
            Pothole, streetlight, dumping — one minute.
          </p>
        </div>
        <span aria-hidden="true" style={{ fontSize: "1.25rem", opacity: 0.9 }}>→</span>
      </Link>

      {isEmpty && <TryDemoPanel />}

      {/* 3. Grouped services */}
      <ServiceGrid />

      <Card style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "0.9375rem", fontWeight: 600 }}>Quick links</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <QuickLink href="/reports">My reports</QuickLink>
          <QuickLink href="/rates">Rates</QuickLink>
          <QuickLink href="/account">My account</QuickLink>
        </div>
      </Card>
    </main>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      padding: "0.375rem 0.75rem",
      background: "var(--surface-muted)",
      borderRadius: "var(--r-full)",
      fontSize: "0.8125rem",
      fontWeight: 600,
      textDecoration: "none",
      color: "var(--text-primary)",
    }}>{children}</Link>
  );
}

function CouncilHeader({ me }: { me: Me }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0.5rem 0 1rem",
        marginBottom: "1rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {me.council.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={me.council.logo_url}
          alt={me.council.name}
          style={{ height: 40, width: "auto", maxWidth: 220, display: "block" }}
        />
      ) : (
        <div
          style={{
            width: 40, height: 40,
            borderRadius: "var(--r-md)",
            background: me.council.brand_color,
          }}
          aria-hidden="true"
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0,
          fontSize: "0.65rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          fontWeight: 700,
        }}>Welcome back</p>
        <p style={{
          margin: 0,
          fontSize: "1.0625rem",
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{me.name ?? me.email}</p>
      </div>
      <Link href="/account" aria-label="Account" style={{
        width: 38, height: 38, borderRadius: "var(--r-full)",
        background: "var(--surface-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-primary)",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
      </Link>
    </header>
  );
}
