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

// helpers
const money = (v) => (v == null ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
const titleCase = (s) => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// keys to hide in generic renderer
const EXCLUDE_KEYS = new Set([
  'id','address','council_name','council_logo_url','gps_coordinates','shape_file_data',
  'property_type','land_size_sqm','property_value','land_value','zone',
  'created_at','updated_at','submitted_at','rates'
]);

function MiniMap({ item, councilLogo }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(ref.current, {
        zoomControl: false, attributionControl: false, scrollWheelZoom: false,
        doubleClickZoom: false, dragging: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const dynamic = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.GeoJSON) dynamic.push(layer);
    });
    dynamic.forEach((l) => map.removeLayer(l));

    const bounds = [];
    const hasGps = item?.gps_coordinates?.lat != null && item?.gps_coordinates?.lon != null;

    if (hasGps) {
      const ll = [item.gps_coordinates.lat, item.gps_coordinates.lon];
      L.marker(ll).addTo(map);
      bounds.push(ll);
    }

    if (item?.shape_file_data) {
      try {
        const data = typeof item.shape_file_data === 'string' ? JSON.parse(item.shape_file_data) : item.shape_file_data;
        const gj = L.geoJSON(data, { style: { color: '#3b82f6', weight: 2, opacity: 0.75, fillOpacity: 0.15, fillColor: '#3b82f6' } }).addTo(map);
        if (gj.getBounds) bounds.push(gj.getBounds());
      } catch (e) { console.error('Bad shape_file_data', e); }
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

  return (
    <div className="map-stack">
      <div className="mini-map-container" ref={ref} />
      {councilLogo && (
        <img src={councilLogo} alt="Council logo" className="council-logo-under-map" />
      )}
    </div>
  );
}

function RatesBlocks({ rates }) {
  if (!rates) return null;

  const {
    balance, next_due_date, instalment_schedule = [],
    dd_active, ebill_active,
    valuation_history = [], recent_invoices = [],
    waste_entitlements, overlays = [], last_bill, // charges are in rate_charges table shown via backend if you add it later
  } = rates;

  return (
    <div className="rates-grid">
      {/* Summary */}
      <div className="rates-card">
        <div className="section-title">Account Summary</div>
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
        <div className="section-title">Instalments</div>
        {instalment_schedule.length === 0 ? (
          <div className="muted">No instalments.</div>
        ) : (
          <ul className="simple-list">
            {instalment_schedule.map((it) => (
              <li key={`${it.seq}-${it.due_date}`}>
                <strong>#{it.seq}</strong> &middot; {new Date(it.due_date).toLocaleDateString()} &middot; {money(it.amount)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Last bill + history */}
      <div className="rates-card">
        <div className="section-title">Last Bill</div>
        {last_bill ? (
          <>
            <div className="kv"><span className="k">Period</span>
              <span className="v">
                {last_bill.period_start ? new Date(last_bill.period_start).toLocaleDateString() : '—'} – {last_bill.period_end ? new Date(last_bill.period_end).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="kv"><span className="k">Amount</span><span className="v">{money(last_bill.amount)}</span></div>
            <div className="kv"><span className="k">Status</span><span className="v">{titleCase(last_bill.status || '—')}</span></div>
            <div className="kv"><span className="k">Method</span><span className="v">{last_bill.method || '—'}</span></div>
          </>
        ) : <div className="muted">No bill yet.</div>}

        <div className="subhead">Recent Bills</div>
        {recent_invoices.length === 0 ? (
          <div className="muted">No history.</div>
        ) : (
          <ul className="simple-list">
            {recent_invoices.map((b) => (
              <li key={b.id}>
                {new Date(b.period_end || b.period_start).toLocaleDateString()} &middot; {money(b.amount)} &middot; {titleCase(b.status || '')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Valuations */}
      <div className="rates-card">
        <div className="section-title">Valuation History</div>
        {valuation_history.length === 0 ? (
          <div className="muted">No valuations.</div>
        ) : (
          <ul className="simple-list">
            {valuation_history
              .sort((a,b)=> (a.year||0)-(b.year||0))
              .map((v) => (
                <li key={v.year}>
                  <strong>{v.year}</strong> &middot; CV {money(v.capital_value)} &middot; LV {money(v.land_value)} {v.percent_change!=null && <em>({v.percent_change}%)</em>}
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Waste & overlays */}
      <div className="rates-card">
        <div className="section-title">Waste & Overlays</div>
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
            <div className="subhead">Overlays</div>
            <div className="chip-row">
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

function PropertyItem({ item }) {
  // extra scalar fields beyond curated set
  const extraEntries = Object.entries(item)
    .filter(([k, v]) => !EXCLUDE_KEYS.has(k) && v != null && typeof v !== 'object');

  return (
    <li className="property-item-card">
      <div className="property-item-inner">
        {/* LEFT: text */}
        <div className="property-details-content">
          <div className="property-title">{item.address || '—'}</div>
          {item.council_name && <div className="property-info muted">Council: {item.council_name}</div>}

          {/* curated */}
          {item.property_type && <div className="property-info"><span className="label">Type</span><span>{titleCase(item.property_type)}</span></div>}
          {item.zone && <div className="property-info"><span className="label">Zone</span><span>{item.zone}</span></div>}
          {item.land_size_sqm != null && <div className="property-info"><span className="label">Land Size</span><span>{item.land_size_sqm} m²</span></div>}
          {item.land_value != null && <div className="property-info"><span className="label">Land Value</span><span>{money(item.land_value)}</span></div>}
          {item.property_value != null && <div className="property-info"><span className="label">Property Value</span><span>{money(item.property_value)}</span></div>}

          {/* any other scalars */}
          {extraEntries.map(([k, v]) => (
            <div className="property-info" key={k}><span className="label">{titleCase(k)}</span><span>{String(v)}</span></div>
          ))}

          {/* rates sections */}
          <RatesBlocks rates={item.rates} />
        </div>

        {/* RIGHT: map + council logo (under map) */}
        <MiniMap item={item} councilLogo={item.council_logo_url} />
      </div>
    </li>
  );
}

export default function RatesDetails({ properties }) {
  useEffect(() => { console.log('RatesDetails received properties:', properties); }, [properties]);
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
