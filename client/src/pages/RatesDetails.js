// src/pages/RatesDetails.js
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

/* =========================
   Inline style injection
   ========================= */
const STYLE_ID = 'rates-details-modern';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  :root {
    --card-bg: #ffffff;
    --soft: #f5f7fb;
    --line: #e8ecf3;
    --ink: #0f172a;
    --muted: #6b7280;
    --accent: #2563eb;
    --ok: #16a34a;
    --radius: 14px;
    --shadow: 0 6px 18px rgba(2, 6, 23, 0.06);
  }

  .rates-details-content { width: 100%; }
  .property-list-details ul { list-style: none; padding: 0; margin: 0; }
  .property-item-card { margin: 18px 0; }

  /* Card shell */
  .property-item-inner {
    display: grid;
    grid-template-columns: 1.2fr 0.9fr;      /* left text / right map */
    gap: 20px;
    align-items: start;
    background: var(--card-bg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px;
  }

  /* Header: logo, council, address */
  .prop-header {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 12px;
    row-gap: 4px;
    margin-bottom: 10px;
  }

  .council-logo-rect {
    height: clamp(28px, 3.2vw, 46px);
    width: auto;
    max-width: clamp(80px, 12vw, 180px);
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }

  .council-name {
    font-weight: 600;
    color: var(--muted);
    font-size: 13px;
  }

  .property-title {
    grid-column: 1 / -1;
    font-weight: 800;
    letter-spacing: 0.2px;
    color: var(--ink);
    font-size: clamp(16px, 1.7vw, 20px);
    margin-top: 2px;
  }

  /* Quick facts pills */
  .quick-facts {
    display: flex; flex-wrap: wrap; gap: 8px;
    margin: 6px 0 2px 0;
  }
  .pill {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--ink);
    white-space: nowrap;
  }

  /* Two-column info (Type, Zone, Land…) */
  .info-grid {
    display: grid;
    grid-template-columns: 120px 1fr;
    column-gap: 12px;
    row-gap: 4px;
    margin: 6px 0 10px 0;
  }
  .info-k { color: var(--muted); }
  .info-v { color: var(--ink); }

  .divider {
    height: 1px;
    background: var(--line);
    margin: 10px 0 14px 0;
    border-radius: 1px;
  }

  /* Right column map */
  .property-map-wrap {
    display: flex;
    justify-content: flex-start;
  }
  .mini-map-container {
    height: clamp(140px, 16vw, 180px);
    width: clamp(220px, 26vw, 320px);
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--line);
  }

  /* Rates blocks – compact cards */
  .rates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }
  .rates-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px;
  }
  .rates-card .title {
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .kv { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin: 4px 0; }
  .kv .k { color: var(--muted); }
  .kv .v { color: var(--ink); }

  .chip-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .chip {
    border: 1px solid var(--line);
    background: var(--soft);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 12px;
  }
  .chip.ok {
    border-color: #bff0c9;
    background: #f0fdf4;
    color: #166534;
  }
  .chip.badge {
    background: #eef2ff;
    border-color: #c7d2fe;
  }

  .simple-list { margin: 0; padding-left: 16px; }
  .muted { color: var(--muted); }

  /* Mobile stack */
  @media (max-width: 860px) {
    .property-item-inner { grid-template-columns: 1fr; }
    .property-map-wrap { order: 2; }
    .mini-map-container { width: 100%; height: 220px; }
  }
  `;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

/* =========================
   Leaflet marker assets
   ========================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

/* =========================
   Helpers
   ========================= */
const money = (v) =>
  v == null ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const titleCase = (s) =>
  String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const EXCLUDE_KEYS = new Set([
  'id','address','council_name','council_logo_url','gps_coordinates','shape_file_data',
  'property_type','land_size_sqm','property_value','land_value','zone',
  'created_at','updated_at','submitted_at','rates'
]);

/* =========================
   Mini Map
   ========================= */
function MiniMap({ item }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(ref.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' })
        .addTo(mapRef.current);
    }

    const map = mapRef.current;

    // clear dynamic layers
    const toRemove = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.GeoJSON)
        toRemove.push(layer);
    });
    toRemove.forEach((l) => map.removeLayer(l));

    const bounds = [];
    const hasGps = item?.gps_coordinates?.lat != null && item?.gps_coordinates?.lon != null;

    if (hasGps) {
      const ll = [item.gps_coordinates.lat, item.gps_coordinates.lon];
      L.marker(ll).addTo(map);
      bounds.push(ll);
    }

    if (item?.shape_file_data) {
      try {
        const data = typeof item.shape_file_data === 'string'
          ? JSON.parse(item.shape_file_data)
          : item.shape_file_data;
        const gj = L.geoJSON(data, {
          style: { color: '#3b82f6', weight: 2, opacity: 0.75, fillOpacity: 0.15, fillColor: '#3b82f6' }
        }).addTo(map);
        if (gj.getBounds) bounds.push(gj.getBounds());
      } catch (e) {
        console.error('Bad shape_file_data', e);
      }
    }

    if (bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [10, 10], maxZoom: 16 });
    } else if (hasGps) {
      map.setView([item.gps_coordinates.lat, item.gps_coordinates.lon], 15);
    } else {
      map.setView([-33.8688, 151.2093], 12);
    }

    setTimeout(() => map.invalidateSize(), 0);
  }, [item]);

  return <div className="mini-map-container" ref={ref} />;
}

/* =========================
   Rates Blocks (compact)
   ========================= */
function RatesBlocks({ rates }) {
  if (!rates) return null;

  const {
    balance, next_due_date, instalment_schedule = [],
    dd_active, ebill_active,
    valuation_history = [], recent_invoices = [],
    waste_entitlements, overlays = [], last_bill,
  } = rates;

  return (
    <div className="rates-grid">
      {/* Summary */}
      <div className="rates-card">
        <div className="title">Account Summary</div>
        <div className="kv">
          <span className="k">Current Balance</span>
          <span className="v">{money(balance)}</span>
        </div>
        <div className="kv">
          <span className="k">Next Due</span>
          <span className="v">{next_due_date ? new Date(next_due_date).toLocaleDateString() : '—'}</span>
        </div>
        <div className="chip-row">
          <span className={`chip ${dd_active ? 'ok' : ''}`}>Direct Debit {dd_active ? 'On' : 'Off'}</span>
          <span className={`chip ${ebill_active ? 'ok' : ''}`}>eNotice {ebill_active ? 'On' : 'Off'}</span>
        </div>
      </div>

      {/* Instalments */}
      <div className="rates-card">
        <div className="title">Instalments</div>
        {instalment_schedule.length === 0 ? (
          <div className="muted">No instalments.</div>
        ) : (
          <ul className="simple-list">
            {instalment_schedule.map((it) => (
              <li key={`${it.seq}-${it.due_date}`}>
                <strong>#{it.seq}</strong> · {new Date(it.due_date).toLocaleDateString()} · {money(it.amount)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Last bill + history */}
      <div className="rates-card">
        <div className="title">Last Bill</div>
        {last_bill ? (
          <>
            <div className="kv"><span className="k">Period</span>
              <span className="v">
                {last_bill.period_start ? new Date(last_bill.period_start).toLocaleDateString() : '—'}
                {' – '}
                {last_bill.period_end ? new Date(last_bill.period_end).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="kv"><span className="k">Amount</span><span className="v">{money(last_bill.amount)}</span></div>
            <div className="kv"><span className="k">Status</span><span className="v">{titleCase(last_bill.status || '—')}</span></div>
            <div className="kv"><span className="k">Method</span><span className="v">{last_bill.method || '—'}</span></div>
          </>
        ) : <div className="muted">No bill yet.</div>}

        <div className="title" style={{marginTop: 10}}>Recent Bills</div>
        {recent_invoices.length === 0 ? (
          <div className="muted">No history.</div>
        ) : (
          <ul className="simple-list">
            {recent_invoices.map((b) => (
              <li key={b.id}>
                {new Date(b.period_end || b.period_start).toLocaleDateString()} · {money(b.amount)} · {titleCase(b.status || '')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Valuations */}
      <div className="rates-card">
        <div className="title">Valuation History</div>
        {valuation_history.length === 0 ? (
          <div className="muted">No valuations.</div>
        ) : (
          <ul className="simple-list">
            {valuation_history
              .sort((a,b)=> (a.year||0)-(b.year||0))
              .map((v) => (
                <li key={v.year}>
                  <strong>{v.year}</strong> · CV {money(v.capital_value)} · LV {money(v.land_value)} {v.percent_change!=null && <em>({v.percent_change}%)</em>}
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Waste & overlays */}
      <div className="rates-card">
        <div className="title">Waste & Overlays</div>
        {waste_entitlements ? (
          <>
            <div className="kv"><span className="k">Bin Size</span><span className="v">{waste_entitlements.bin_size_l ? `${waste_entitlements.bin_size_l}L` : '—'}</span></div>
            <div className="kv"><span className="k">Extra Bins</span><span className="v">{waste_entitlements.extra_bins ?? '—'}</span></div>
            {waste_entitlements.collection_day && (
              <div className="kv"><span className="k">Collection Day</span><span className="v">{waste_entitlements.collection_day}</span></div>
            )}
          </>
        ) : <div className="muted">No waste entitlements.</div>}

        {Array.isArray(overlays) && overlays.length > 0 && (
          <>
            <div className="chip-row" style={{marginTop: 8}}>
              {overlays.map((o, i) => (
                <span className="chip badge" key={`${o}-${i}`}>{titleCase(o)}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
   Property Item
   ========================= */
function PropertyItem({ item }) {
  const extras = Object.entries(item)
    .filter(([k, v]) => !EXCLUDE_KEYS.has(k) && v != null && typeof v !== 'object');

  return (
    <li className="property-item-card">
      <div className="property-item-inner">
        {/* LEFT */}
        <div>
          <div className="prop-header">
            {item.council_logo_url && (
              <img
                src={item.council_logo_url}
                alt={`${item.council_name || 'Council'} logo`}
                className="council-logo-rect"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="council-name">{item.council_name || ''}</div>
            <div className="property-title">{item.address || '—'}</div>
          </div>

          {/* quick facts */}
          <div className="quick-facts">
            {item.property_type && <span className="pill">{titleCase(item.property_type)}</span>}
            {item.zone && <span className="pill">Zone {item.zone}</span>}
            {item.land_size_sqm != null && <span className="pill">{item.land_size_sqm} m²</span>}
            {item.land_value != null && <span className="pill">LV {money(item.land_value)}</span>}
            {item.property_value != null && <span className="pill">PV {money(item.property_value)}</span>}
          </div>

          <div className="divider"></div>

          {/* optional extra scalars (kept light) */}
          {extras.length > 0 && (
            <div className="info-grid" style={{marginBottom: 12}}>
              {extras.map(([k, v]) => (
                <React.Fragment key={k}>
                  <div className="info-k">{titleCase(k)}</div>
                  <div className="info-v">{String(v)}</div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* rates sections */}
          <RatesBlocks rates={item.rates} />
        </div>

        {/* RIGHT */}
        <div className="property-map-wrap">
          <MiniMap item={item} />
        </div>
      </div>
    </li>
  );
}

/* =========================
   Root
   ========================= */
export default function RatesDetails({ properties }) {
  useEffect(() => { injectStyles(); }, []);
  if (!properties || properties.length === 0) return <p>No properties found for this user.</p>;

  return (
    <div className="rates-details-content">
      <div className="property-list-details">
        <ul>
          {properties.map((item) => (
            <PropertyItem key={item.id ?? item.address ?? Math.random()} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}
