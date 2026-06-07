import Link from "next/link";
import * as React from "react";

interface Service {
  key: string;
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

interface Group {
  key: string;
  label: string;
  services: Service[];
}

const GROUPS: Group[] = [
  {
    key: "report",
    label: "Report & track",
    services: [
      { key: "report", label: "Report an issue", href: "/reports/new", description: "Potholes, lights, dumping", icon: <IconReport /> },
      { key: "my_reports", label: "My reports", href: "/reports", description: "Status & updates", icon: <IconDocument /> },
      { key: "map", label: "Map", href: "/map", description: "Reports near you", icon: <IconMap /> },
      { key: "road_closures", label: "Road closures", href: "/road-closures", description: "Works & detours", icon: <IconRoad /> },
      { key: "disaster", label: "Disaster", href: "/disaster", description: "Alerts, evac, sandbags", icon: <IconHeart /> },
      { key: "food_premises", label: "Food hygiene", href: "/food-premises", description: "Inspection grades", icon: <IconShop /> },
      { key: "sensors", label: "Sensors", href: "/sensors", description: "Air, noise, water", icon: <IconLeaf /> },
      { key: "footpath", label: "Footpath audit", href: "/footpath", description: "Help map kerbs", icon: <IconRoad /> },
      { key: "lost_found", label: "Lost & found", href: "/lost-found", description: "Pets & items", icon: <IconPaw /> },
    ],
  },
  {
    key: "pay",
    label: "Pay & manage",
    services: [
      { key: "rates", label: "Rates", href: "/rates", description: "Balance, invoices, BPAY", icon: <IconDocument /> },
      { key: "water", label: "Water", href: "/water", description: "Consumption & bills", icon: <IconDroplet /> },
      { key: "waste", label: "Waste & bins", href: "/waste", description: "Collection days", icon: <IconTrash /> },
      { key: "bin_lookup", label: "Bin lookup", href: "/bin-lookup", description: "What bin tomorrow?", icon: <IconTrash /> },
      { key: "pets", label: "Pets", href: "/pets", description: "Register & renew", icon: <IconPaw /> },
      { key: "permits", label: "Permits", href: "/permits", description: "Parking & visitor", icon: <IconBuilding /> },
      { key: "hardship", label: "Hardship", href: "/hardship", description: "Pensioner & relief", icon: <IconHeart /> },
      { key: "childcare", label: "Childcare", href: "/childcare", description: "Vacancies & waitlists", icon: <IconUsers /> },
      { key: "burn_permits", label: "Burn permits", href: "/burn-permits", description: "Pile / stubble burns", icon: <IconHeart /> },
    ],
  },
  {
    key: "say",
    label: "Have your say",
    services: [
      { key: "announcements", label: "Announcements", href: "/announcements", description: "Council news", icon: <IconMegaphone /> },
      { key: "noticeboard", label: "Noticeboard", href: "/noticeboard", description: "Local events & lost found", icon: <IconUsers /> },
      { key: "meetings", label: "Meetings", href: "/meetings", description: "Agendas & minutes", icon: <IconGavel /> },
      { key: "pb", label: "Community budget", href: "/pb", description: "Vote on projects", icon: <IconChart /> },
      { key: "panels", label: "Citizen panels", href: "/panels", description: "Random-jury deliberation", icon: <IconUsers /> },
      { key: "surveys", label: "Surveys", href: "/surveys", description: "Tell us what you think", icon: <IconMegaphone /> },
      { key: "petitions", label: "Petitions", href: "/petitions", description: "Start or sign one", icon: <IconUsers /> },
      { key: "foi", label: "GIPA / FOI", href: "/foi", description: "Request records", icon: <IconDocument /> },
      { key: "grants", label: "Grants", href: "/grants", description: "Draft & opportunities", icon: <IconDocument /> },
    ],
  },
  {
    key: "involve",
    label: "Get involved",
    services: [
      { key: "volunteer", label: "Volunteer", href: "/volunteer", description: "Help out council", icon: <IconUsers /> },
      { key: "programs", label: "Programs", href: "/programs", description: "Bookings", icon: <IconCalendar /> },
      { key: "trees", label: "Tree register", href: "/trees", description: "Adopt-a-tree", icon: <IconLeaf /> },
      { key: "donations", label: "Community fund", href: "/donations", description: "Back local projects", icon: <IconHeart /> },
      { key: "library", label: "Library", href: "/library", description: "Search & hold", icon: <IconDocument /> },
      { key: "lot", label: "Library of Things", href: "/library-of-things", description: "Borrow tools etc.", icon: <IconShop /> },
      { key: "gardens", label: "Community gardens", href: "/gardens", description: "Apply for a plot", icon: <IconLeaf /> },
      { key: "jobs", label: "Jobs board", href: "/jobs", description: "Roles & work experience", icon: <IconShop /> },
    ],
  },
  {
    key: "discover",
    label: "Discover",
    services: [
      { key: "businesses", label: "Businesses", href: "/businesses", description: "Local trades & shops", icon: <IconShop /> },
      { key: "tourism", label: "What's on", href: "/tourism", description: "Events & places", icon: <IconMap /> },
      { key: "calendar", label: "Calendar", href: "/calendar", description: "Export to iCal", icon: <IconCalendar /> },
      { key: "climate", label: "Climate", href: "/climate", description: "Sustainability targets", icon: <IconLeaf /> },
      { key: "budget", label: "Budget", href: "/budget", description: "Where your rates go", icon: <IconChart /> },
      { key: "open_data", label: "Open data", href: "/open-data", description: "CSV downloads", icon: <IconDocument /> },
      { key: "ev", label: "EV chargers", href: "/ev", description: "Map & booking", icon: <IconDroplet /> },
      { key: "swim", label: "Swim conditions", href: "/swim", description: "Beaches, pools, river", icon: <IconDroplet /> },
      { key: "heritage", label: "Heritage & Country", href: "/heritage", description: "Story places", icon: <IconLeaf /> },
      { key: "rebates", label: "Climate rebates", href: "/rebates", description: "Solar, battery, EV", icon: <IconLeaf /> },
      { key: "procurement", label: "Tenders & contracts", href: "/procurement", description: "Awards transparency", icon: <IconDocument /> },
      { key: "ask", label: "Ask council", href: "/ask", description: "AI assistant", icon: <IconMegaphone /> },
    ],
  },
  {
    key: "land",
    label: "Land & development",
    services: [
      { key: "development", label: "Development", href: "/development", description: "DAs & approvals", icon: <IconBuilding /> },
      { key: "land_hire", label: "Hire venue", href: "/land-hire", description: "Halls, ovals, BBQ", icon: <IconBuilding /> },
      { key: "cemetery", label: "Cemetery", href: "/cemetery", description: "Plot search", icon: <IconDocument /> },
      { key: "animals", label: "Animals", href: "/animals", description: "Adoptions & registration", icon: <IconPaw /> },
    ],
  },
];

export function ServiceGrid() {
  return (
    <section className="sg" aria-label="Services">
      <style>{`
        .sg { margin-bottom: 1rem; }
        .sg-group { margin-bottom: 1rem; }
        .sg-h3 {
          margin: 0 0 0.375rem;
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .sg-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .sg-tile {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0.5rem 0.5rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          text-decoration: none;
          color: var(--text-primary);
          min-height: 64px;
          box-shadow: var(--e1);
        }
        .sg-tile-icon { color: var(--brand); }
        .sg-tile-label {
          font-weight: 600;
          font-size: 0.75rem;
          line-height: 1.2;
        }
        .sg-tile-desc {
          font-size: 0.625rem;
          color: var(--text-secondary);
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (min-width: 480px) {
          .sg-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
          .sg-tile { padding: 0.75rem 0.875rem; min-height: 80px; gap: 4px; border-radius: var(--r-lg); }
          .sg-tile-label { font-size: 0.875rem; line-height: 1.25; }
          .sg-tile-desc { font-size: 0.7rem; line-height: 1.3; }
          .sg-h3 { margin-bottom: 0.5rem; font-size: 0.7rem; }
          .sg-group { margin-bottom: 1.25rem; }
        }
      `}</style>
      {GROUPS.map((g) => (
        <div key={g.key} className="sg-group">
          <h3 className="sg-h3">{g.label}</h3>
          <ul className="sg-grid">
            {g.services.map((s) => (
              <li key={s.key}>
                <Link href={s.href} className="sg-tile">
                  <span className="sg-tile-icon">{s.icon}</span>
                  <span className="sg-tile-label">{s.label}</span>
                  <span className="sg-tile-desc">{s.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

// --- Inline SVG icons (22px, stroke 1.75) ---

function IconBase({ children, ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
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
function IconHeart() {
  return (
    <IconBase>
      <path d="M20.84 4.6a5.5 5.5 0 0 0-7.78 0L12 5.66 10.94 4.6a5.5 5.5 0 0 0-7.78 7.78L12 21l8.84-8.62a5.5 5.5 0 0 0 0-7.78z" />
    </IconBase>
  );
}
function IconChart() {
  return (
    <IconBase>
      <line x1="4" y1="20" x2="4" y2="10" />
      <line x1="10" y1="20" x2="10" y2="4" />
      <line x1="16" y1="20" x2="16" y2="14" />
      <line x1="22" y1="20" x2="22" y2="8" />
    </IconBase>
  );
}
function IconShop() {
  return (
    <IconBase>
      <path d="M3 9l1-5h16l1 5" />
      <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M9 21v-6h6v6" />
    </IconBase>
  );
}
