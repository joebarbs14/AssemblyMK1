import Link from "next/link";
import * as React from "react";

interface Service {
  key: string;
  label: string;
  href: string;
  available: boolean;
  description: string;
  icon: React.ReactNode;
}

const SERVICES: Service[] = [
  {
    key: "rates",
    label: "Rates",
    href: "/rates",
    available: true,
    description: "Balance, invoices, BPAY",
    icon: <IconDocument />,
  },
  {
    key: "report",
    label: "Report an issue",
    href: "/reports/new",
    available: true,
    description: "Potholes, lights, dumping",
    icon: <IconReport />,
  },
  {
    key: "water",
    label: "Water",
    href: "/water",
    available: true,
    description: "Consumption & bills",
    icon: <IconDroplet />,
  },
  {
    key: "waste",
    label: "Waste & bins",
    href: "/waste",
    available: true,
    description: "Collection days",
    icon: <IconTrash />,
  },
  {
    key: "roads",
    label: "Roads",
    href: "/reports/new",
    available: true,
    description: "Report a road issue",
    icon: <IconRoad />,
  },
  {
    key: "development",
    label: "Development",
    href: "/development",
    available: true,
    description: "DAs & approvals",
    icon: <IconBuilding />,
  },
  {
    key: "community",
    label: "Community",
    href: "/announcements",
    available: true,
    description: "News & announcements",
    icon: <IconMegaphone />,
  },
  {
    key: "animals",
    label: "Animals",
    href: "/animals",
    available: true,
    description: "Adoptions & registration",
    icon: <IconPaw />,
  },
  {
    key: "map",
    label: "Map",
    href: "/map",
    available: true,
    description: "Reports near you",
    icon: <IconMap />,
  },
  {
    key: "noticeboard",
    label: "Noticeboard",
    href: "/noticeboard",
    available: true,
    description: "Local events & lost found",
    icon: <IconUsers />,
  },
  {
    key: "meetings",
    label: "Meetings",
    href: "/meetings",
    available: true,
    description: "Agendas & minutes",
    icon: <IconGavel />,
  },
  {
    key: "climate",
    label: "Climate",
    href: "/climate",
    available: true,
    description: "Sustainability targets",
    icon: <IconLeaf />,
  },
  {
    key: "programs",
    label: "Programs",
    href: "/programs",
    available: true,
    description: "Volunteer & bookings",
    icon: <IconCalendar />,
  },
];

export function ServiceGrid() {
  return (
    <section style={{ marginBottom: "1rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem" }}>Services</h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {SERVICES.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "0.875rem 1rem",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                textDecoration: "none",
                color: "var(--text-primary)",
                minHeight: 96,
                position: "relative",
                boxShadow: "var(--e1)",
              }}
            >
              <div style={{ color: "var(--brand)" }}>{s.icon}</div>
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{s.label}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {s.description}
              </span>
              {!s.available && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-secondary)",
                    background: "var(--surface-muted)",
                    padding: "2px 6px",
                    borderRadius: "var(--r-full)",
                  }}
                >
                  Soon
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Inline SVG icons (24px, stroke 1.75) ---

function IconBase({ children, ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

function IconDocument() {
  return (
    <IconBase>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </IconBase>
  );
}
function IconReport() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </IconBase>
  );
}
function IconDroplet() {
  return (
    <IconBase>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </IconBase>
  );
}
function IconTrash() {
  return (
    <IconBase>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </IconBase>
  );
}
function IconRoad() {
  return (
    <IconBase>
      <line x1="6" y1="3" x2="6" y2="21" />
      <line x1="18" y1="3" x2="18" y2="21" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="12" y1="20" x2="12" y2="20" />
    </IconBase>
  );
}
function IconBuilding() {
  return (
    <IconBase>
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="22" x2="9" y2="18" />
      <line x1="15" y1="22" x2="15" y2="18" />
      <line x1="8" y1="6" x2="10" y2="6" />
      <line x1="14" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
    </IconBase>
  );
}
function IconMegaphone() {
  return (
    <IconBase>
      <path d="M3 11l18-8v18l-18-8v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </IconBase>
  );
}
function IconPaw() {
  return (
    <IconBase>
      <circle cx="6" cy="9" r="2" />
      <circle cx="10" cy="5" r="2" />
      <circle cx="14" cy="5" r="2" />
      <circle cx="18" cy="9" r="2" />
      <path d="M12 11c-3 0-7 3-7 6a3 3 0 0 0 3 3c1 0 2-1 4-1s3 1 4 1a3 3 0 0 0 3-3c0-3-4-6-7-6z" />
    </IconBase>
  );
}
function IconMap() {
  return (
    <IconBase>
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </IconBase>
  );
}
function IconUsers() {
  return (
    <IconBase>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <path d="M16 21v-1a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v1" />
    </IconBase>
  );
}
function IconGavel() {
  return (
    <IconBase>
      <path d="M14 4l6 6" />
      <path d="M11 7l6 6" />
      <path d="M5 13l6 6" />
      <path d="M3 21h12" />
      <line x1="13" y1="2" x2="22" y2="11" />
    </IconBase>
  );
}
function IconLeaf() {
  return (
    <IconBase>
      <path d="M21 3v6a9 9 0 0 1-9 9H5" />
      <path d="M5 18c0-5 3-9 8-10" />
    </IconBase>
  );
}
function IconCalendar() {
  return (
    <IconBase>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </IconBase>
  );
}
