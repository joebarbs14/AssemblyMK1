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

// --- helpers ----------------------------------------------------
const moneyish = (k) =>
  /(?:amount|balance|total|value|charge|bill|rate|fees?)$/i.test(k);

const formatValue = (k, v) => {
  if (v == null || v === '') return '';
  // Try number formatting for money-like keys
  if (moneyish(k)) {
    const num = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return `$${num.toLocaleString()}`;
    }
  }
  // Basic pretty-print for arrays/objects (1 level)
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 0);
    } catch {
      return String(v);
    }
  }
  return String(v);
};

// Exclude noisy/large keys from the generic renderer
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
  // common meta/noise
  'created_at',
  'updated_at',
  'submitted_at',
]);

const titleCase = (s) =>
  s.replace(/[_-]+/g, ' ')
   .replace(/\b\w/g, (m) => m.toUpperCase());

// --- components -------------------------------------------------
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

    // Clear dynamic layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = [];

    // Marker
    if (item.gps_coordinates && item.gps_coordinates.lat != null && item.gps_coordinates.lon != null) {
      const latLng = [item.gps_coordinates.lat, item.gps_coordinates.lon];
      L.marker(latLng).addTo(map);
      bounds.push(latLng);
    }

    // GeoJSON
    if (item.shape_file_data) {
      try {
        const geoJsonData = typeof item.shape_file_data === 'string'
          ? JSON.parse(item.shape_file_data)
          : item.shape_file_data;
        const geoJsonLayer = L.geoJSON(geoJsonData, {
          style: { color: '#ff7800', weight: 2, opacity: 0.65, fillOpacity: 0.2, fillColor: '#ff7800' },
        }).addTo(map);
        if (geoJsonLayer.getBounds) bounds.push(geoJsonLayer.getBounds());
      } catch (e) {
        console.error('Error parsing shape_file_data for property:', item.id, e);
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [10, 10], maxZoom: 16 });
    } else if (item.gps_coordinates && item.gps_coordinates.lat != null && item.gps_coordinates.lon != null) {
      map.setView([item.gps_coordinates.lat, item.gps_coordinates.lon], 15);
    } else {
      map.setView([-33.8688, 151.2093], 12); // Sydney fallback
    }

    map.invalidateSize();

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [item]);

  // Build a list of extra scalar fields to display (beyond the known ones above)
  const extraEntries = Object.entries(item)
    .filter(([k, v]) => !EXCLUDE_KEYS.has(k) && v != null && typeof v !== 'object');

  // A few common alternate keys (if backend changed names)
  const altLandSize = item.land_size ?? item.land_area ?? item.site_area_sqm;
  const altPropValue = item.capital_value ?? item.cv ?? item.valuation_amount;
  const altLandValue = item.lv ?? item.site_value ?? item.land_valuation;

  return (
    <li className="property-item-card">
      <div className="property-details-content">
        <div className="property-header">
          <div className="property-address-council">
            <div className="property-title">Address: {item.address}</div>
            {item.council_name && (
              <div className="property-info">Council: {item.council_name}</div>
            )}
          </div>
          {item.council_logo_url && (
            <img src={item.council_logo_url} alt={`${item.council_name || 'Council'} Logo`} className="council-logo-small" />
          )}
        </div>

        {item.property_type && (
          <div className="property-info">
            Type: {item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1)}
          </div>
        )}

        {(item.land_size_sqm || altLandSize) && (
          <div className="property-info">
            Land Size: {item.land_size_sqm ?? altLandSize} m²
          </div>
        )}

        {(item.property_value || altPropValue) && (
          <div className="property-info">
            Property Value: {formatValue('property_value', item.property_value ?? altPropValue)}
          </div>
        )}

        {(item.land_value || altLandValue) && (
          <div className="property-info">
            Land Value: {formatValue('land_value', item.land_value ?? altLandValue)}
          </div>
        )}

        {item.zone && <div className="property-info">Zone: {item.zone}</div>}

        {/* Render any other scalar fields we received */}
        {extraEntries.map(([k, v]) => (
          <div className="property-info" key={k}>
            {titleCase(k)}: {formatValue(k, v)}
          </div>
        ))}
      </div>

      <div className="mini-map-container" ref={miniMapRef} />
    </li>
  );
}

function RatesDetails({ properties }) {
  // Debug: see exactly what we're receiving
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
            <PropertyItem key={item.id ?? item.address} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RatesDetails;
