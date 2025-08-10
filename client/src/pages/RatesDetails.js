// src/pages/RatesDetails.js
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ---------- helpers ----------
const moneyish = (k) => /(?:amount|balance|total|value|charge|bill|rate|fees?)$/i.test(k);

const formatValue = (k, v) => {
  if (v == null || v === '') return '—';
  if (moneyish(k)) {
    const num = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 0); } catch { return String(v); }
  }
  return String(v);
};

const fmtCurrency = (n) =>
  n == null ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const titleCase = (s) =>
  String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// Hide noisy keys in the generic renderer
const EXCLUDE_KEYS = new Set([
  'id',
  'address',
  'council_name',
  'council_logo_url',
  'gps_coordinates',
  'shape_file_data',
  'property_type',
  'land_size_sqm',
  'property_value',
  'land_value',
  'zone',
  // new nested rates payload
  'rates',
  // common meta/noise
  'created_at',
  'updated_at',
  'submitted_at',
]);

// ---------- small subcomponents ----------
function Section({ title, children }) {
  return (
    <div className="rates-section">
      <div className="rates-section-title">{title}</div>
      <div className="rates-section-body">{children}</div>
    </div>
  );
}

function KeyVal({ label, value }) {
  return (
    <div className="rates-kv">
      <span className="rates-k">{label}</span>
      <span className="rates-v">{value}</span>
    </div>
  );
}

function LineItems({ items }) {
  if (!items || items.length === 0) return <div className="muted">No breakdown available.</div>;
  return (
    <ul className="rates-line-items">
      {items.map((it, idx) => (
        <li key={idx}>
          <span className="label">{it.label || 'Item'}</span>
          <span className="amount">{fmtCurrency(it.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function Instalments({ list }) {
  if (!Array.isArray(list) || list.length === 0) return <div className="muted">No instalments.</div>;
  return (
    <ul className="rates-instalments">
      {list.map((i, idx) => (
        <li key={idx}>
          <span className="label">Instalment {i.seq ?? idx + 1}</span>
          <span className="date">{i.due_date ? new Date(i.due_date).toLocaleDateString() : '—'}</span>
          <span className="amount">{fmtCurrency(i.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function ValuationHistory({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return <div className="muted">No valuation history.</div>;
  return (
    <ul className="rates-valuations">
      {rows
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
        .map((r, idx) => (
          <li key={idx}>
            <span className="year">{r.year ?? '—'}</span>
            <span className="cv">Capital: {fmtCurrency(r.capital_value)}</span>
            <span className="lv">Land: {fmtCurrency(r.land_value)}</span>
            {'percent_change' in r && (
              <span className={`chg ${r.percent_change > 0 ? 'up' : r.percent_change < 0 ? 'down' : ''}`}>
                {r.percent_change > 0 ? '+' : ''}{r.percent_change ?? 0}% YoY
              </span>
            )}
          </li>
        ))}
    </ul>
  );
}

function Overlays({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="rates-overlays">
      {items.map((o, i) => (
        <span className="badge" key={i}>{o}</span>
      ))}
    </div>
  );
}

// ---------- main per-property card ----------
function PropertyItem({ item }) {
  const miniMapRef = useRef(null);
  const miniMapInstance = useRef(null);

  useEffect(() => {
    if (!miniMapRef.current) return;

    if (!miniMapInstance.current) {
      miniMapInstance.current = L.map(miniMapRef.current, {
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
        .addTo(miniMapInstance.current);
    }

    const map = miniMapInstance.current;

    // Clear dynamic layers (keep base)
    const toRemove = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
        toRemove.push(layer);
      }
    });
    toRemove.forEach((l) => map.removeLayer(l));

    const bounds = [];

    // Marker
    const hasGps = item?.gps_coordinates?.lat != null && item?.gps_coordinates?.lon != null;
    if (hasGps) {
      const latLng = [item.gps_coordinates.lat, item.gps_coordinates.lon];
      L.marker(latLng).addTo(map);
      bounds.push(latLng);
    }

    // GeoJSON (styled soft blue)
    if (item?.shape_file_data) {
      try {
        const geoJsonData = typeof item.shape_file_data === 'string'
          ? JSON.parse(item.shape_file_data)
          : item.shape_file_data;

        const gj = L.geoJSON(geoJsonData, {
          style: { color: '#3b82f6', weight: 2, opacity: 0.75, fillOpacity: 0.15, fillColor: '#3b82f6' },
        }).addTo(map);

        if (gj.getBounds) bounds.push(gj.getBounds());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error parsing shape_file_data for property:', item?.id, e);
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [10, 10], maxZoom: 16 });
    } else if (hasGps) {
      map.setView([item.gps_coordinates.lat, item.gps_coordinates.lon], 15);
    } else {
      map.setView([-33.8688, 151.2093], 12); // Sydney fallback
    }

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [item]);

  // Curated alternates (if backend names differ)
  const altLandSize = item.land_size ?? item.land_area ?? item.site_area_sqm;
  const altPropValue = item.capital_value ?? item.cv ?? item.valuation_amount;
  const altLandValue = item.lv ?? item.site_value ?? item.land_valuation;

  // Any leftover scalar fields
  const extraEntries = Object.entries(item).filter(
    ([k, v]) => !EXCLUDE_KEYS.has(k) && v != null && typeof v !== 'object'
  );

  // Rates payload (from /rates/properties)
  const r = item.rates || {};

  return (
    <li className="property-item-card">
      <div className="property-card-grid">
        {/* LEFT: textual details */}
        <div className="property-main">
          {/* Address first */}
          <div className="property-title">{item.address || '—'}</div>
          {item.council_name && <div className="property-info">Council: {item.council_name}</div>}

          {/* Basic property facts */}
          {item.property_type && <KeyVal label="Type" value={item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1)} />}
          {item.zone && <KeyVal label="Zone" value={item.zone} />}
          {(item.land_size_sqm || altLandSize) && <KeyVal label="Land Size" value={`${item.land_size_sqm ?? altLandSize} m²`} />}
          {(item.land_value || altLandValue) && <KeyVal label="Land Value" value={formatValue('land_value', item.land_value ?? altLandValue)} />}
          {(item.property_value || altPropValue) && <KeyVal label="Property Value" value={formatValue('property_value', item.property_value ?? altPropValue)} />}

          {/* RATES SECTIONS (only if present) */}
          {(r.balance != null || r.next_due_date || r.dd_active != null || r.ebill_active != null) && (
            <Section title="Account summary">
              <KeyVal label="Balance" value={fmtCurrency(r.balance)} />
              <KeyVal label="Next due" value={r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : '—'} />
              <KeyVal label="Direct debit" value={r.dd_active ? 'Active' : 'Not active'} />
              <KeyVal label="eNotices" value={r.ebill_active ? 'Enabled' : 'Disabled'} />
              {r.contact_links?.update_payment && (
                <div className="rates-links">
                  <a href={r.contact_links.update_payment} target="_blank" rel="noreferrer">Update payment method</a>
                </div>
              )}
            </Section>
          )}

          {r.last_bill && (
            <Section title="Last bill">
              <KeyVal label="Issued" value={r.last_bill.issue_date ? new Date(r.last_bill.issue_date).toLocaleDateString() : '—'} />
              <KeyVal label="Due" value={r.last_bill.due_date ? new Date(r.last_bill.due_date).toLocaleDateString() : '—'} />
              <KeyVal label="Amount" value={fmtCurrency(r.last_bill.amount)} />
              <KeyVal label="Status" value={titleCase(r.last_bill.status || '—')} />
              <KeyVal label="Suggested payment" value={titleCase(r.last_bill.payment_method_suggested || '—')} />
              <div className="rates-subtitle">Breakdown</div>
              <LineItems items={r.last_bill.line_items} />
            </Section>
          )}

          {Array.isArray(r.instalment_schedule) && r.instalment_schedule.length > 0 && (
            <Section title="Instalments">
              <Instalments list={r.instalment_schedule} />
            </Section>
          )}

          {Array.isArray(r.valuation_history) && r.valuation_history.length > 0 && (
            <Section title="Valuation history">
              <ValuationHistory rows={r.valuation_history} />
            </Section>
          )}

          {r.waste_entitlements && (
            <Section title="Waste entitlements">
              <KeyVal label="Bin size" value={r.waste_entitlements.bin_size_l ? `${r.waste_entitlements.bin_size_l} L` : '—'} />
              <KeyVal label="Extra bins" value={r.waste_entitlements.extra_bins ?? '—'} />
              {r.waste_entitlements.collection_day && (
                <KeyVal label="Collection day" value={r.waste_entitlements.collection_day} />
              )}
              {r.waste_entitlements.service_notes && (
                <div className="muted">{r.waste_entitlements.service_notes}</div>
              )}
            </Section>
          )}

          {r.concessions && (
            <Section title="Concessions">
              <KeyVal label="Eligibility" value={r.concessions.eligible ? 'Eligible' : 'Not eligible'} />
              {r.concessions.type && <KeyVal label="Type" value={titleCase(r.concessions.type)} />}
              {r.concessions.link && (
                <div className="rates-links">
                  <a href={r.concessions.link} target="_blank" rel="noreferrer">Apply for concession</a>
                </div>
              )}
            </Section>
          )}

          {Array.isArray(r.overlays) && r.overlays.length > 0 && (
            <Section title="Overlays">
              <Overlays items={r.overlays} />
            </Section>
          )}

          {r.contact_links && (
            <Section title="Contact & requests">
              <div className="rates-links">
                {r.contact_links.query_valuation && (
                  <a href={r.contact_links.query_valuation} target="_blank" rel="noreferrer">Query my valuation</a>
                )}
                {r.contact_links.apply_concession && (
                  <a href={r.contact_links.apply_concession} target="_blank" rel="noreferrer">Apply for concession</a>
                )}
                {r.contact_links.change_address && (
                  <a href={r.contact_links.change_address} target="_blank" rel="noreferrer">Change mailing address</a>
                )}
              </div>
            </Section>
          )}

          {/* Any other scalar fields we got back */}
          {extraEntries.length > 0 && (
            <Section title="Other details">
              {extraEntries.map(([k, v]) => (
                <KeyVal key={k} label={titleCase(k)} value={formatValue(k, v)} />
              ))}
            </Section>
          )}
        </div>

        {/* RIGHT: map + logo underneath */}
        <div className="property-side">
          <div className="mini-map-container" ref={miniMapRef} />
          {item.council_logo_url && (
            <img
              src={item.council_logo_url}
              alt={`${item.council_name || 'Council'} Logo`}
              className="council-logo-under-map"
            />
          )}
        </div>
      </div>
    </li>
  );
}

function RatesDetails({ properties }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('RatesDetails received properties:', properties);
  }, [properties]);

  if (!properties || properties.length === 0) {
    return <p>No properties found for this user.</p>;
  }

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

export default RatesDetails;
