// src/pages/RatesDetails.js (or src/components/RatesDetails.js)
import React, { useEffect, useRef } from 'react';
import L from 'leaflet'; // Import Leaflet library
// Note: leaflet.css is now linked directly in public/index.html

// Fix for default Leaflet icon paths (important for Webpack/CRA builds)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component for a single property with its mini-map
function PropertyItem({ item }) {
  const miniMapRef = useRef(null);
  const miniMapInstance = useRef(null);

  useEffect(() => {
    if (!miniMapRef.current) return; // Ensure the map container div exists

    // Initialize the mini-map only once for this property item
    if (!miniMapInstance.current) {
      miniMapInstance.current = L.map(miniMapRef.current, {
        zoomControl: false, // No zoom control on mini-maps
        attributionControl: false, // No attribution on mini-maps
        scrollWheelZoom: false, // Disable scroll wheel zoom
        doubleClickZoom: false, // Disable double click zoom
        dragging: false, // Disable dragging
        touchZoom: false, // Disable touch zoom
        boxZoom: false, // Disable box zoom
        keyboard: false, // Disable keyboard navigation
        tap: false, // Disable tap
      });

      // Add a tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '', // No attribution for mini-maps
      }).addTo(miniMapInstance.current);
    }

    const map = miniMapInstance.current;

    // Clear existing layers (markers, polygons) before adding new ones
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = [];

    // Add marker for GPS coordinates
    if (item.gps_coordinates && typeof item.gps_coordinates === 'object' && item.gps_coordinates.lat != null && item.gps_coordinates.lon != null) {
      const latLng = [item.gps_coordinates.lat, item.gps_coordinates.lon];
      L.marker(latLng).addTo(map);
      bounds.push(latLng);
    }

    // Add shape file data (GeoJSON) - now hidden from text, but still drawn on map
    if (item.shape_file_data) {
      try {
        const geoJsonData = JSON.parse(item.shape_file_data);
        const geoJsonLayer = L.geoJSON(geoJsonData, {
          style: {
            color: '#ff7800',
            weight: 2, // Thinner lines for mini-map
            opacity: 0.65,
            fillOpacity: 0.2,
            fillColor: '#ff7800'
          },
        }).addTo(map);

        if (geoJsonLayer.getBounds) {
          bounds.push(geoJsonLayer.getBounds());
        }
      } catch (e) {
        console.error("Error parsing shape_file_data for property:", item.id, e);
      }
    }

    // Fit map to bounds of this single property, if any
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [10, 10], maxZoom: 16 }); // Tighter padding, maxZoom to prevent over-zooming
    } else if (item.gps_coordinates && item.gps_coordinates.lat != null && item.gps_coordinates.lon != null) {
      // If no shape data but has GPS, set view to the marker
      map.setView([item.gps_coordinates.lat, item.gps_coordinates.lon], 15); // Default zoom for single marker
    } else {
      // Fallback if no valid coordinates/shape data
      map.setView([-33.8688, 151.2093], 12); // Default center (Sydney)
    }

    // Invalidate map size after component renders to ensure it displays correctly
    map.invalidateSize();

    // Cleanup function: remove map instance when component unmounts
    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [item]); // Rerun effect when the specific item data changes

  // Helper for GPS display string
  const getGpsDisplay = (gps) => {
    if (gps && typeof gps === 'object' && typeof gps.lat === 'number' && typeof gps.lon === 'number') {
      return `Lat: ${gps.lat.toFixed(4)}, Lon: ${gps.lon.toFixed(4)}`;
    }
    return null; // Return null if not valid numeric lat/lon
  };

  const gpsContentToDisplay = getGpsDisplay(item.gps_coordinates);

  return (
    <li key={item.id} className="property-item-card"> {/* Changed class name for better semantic */}
      <div className="property-details-content"> {/* Container for text details */}
        <div className="property-header">
          <div className="property-address-council">
            <div className="property-title">Address: {item.address}</div> {/* Changed class name */}
            {item.council_name && (
              <div className="property-info">Council: {item.council_name}</div> {/* Changed class name */}
            )}
          </div>
          {item.council_logo_url && (
            <img src={item.council_logo_url} alt={`${item.council_name} Logo`} className="council-logo-small" />
          )}
        </div>

        {item.property_type && (
          <div className="property-info">Type: {item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1)}</div>
        )}
        {/* Use the pre-computed string directly, only render the div if content exists */}
        {gpsContentToDisplay && (
          <div className="property-info">
            GPS: {gpsContentToDisplay}
          </div>
        )}
        {item.land_size_sqm && (
          <div className="property-info">Land Size: {item.land_size_sqm} m²</div>
        )}
        {item.property_value && (
          <div className="property-info">Property Value: ${item.property_value.toLocaleString()}</div>
        )}
        {item.land_value && (
          <div className="property-info">Land Value: ${item.land_value.toLocaleString()}</div>
        )}
        {item.zone && (
          <div className="property-info">Zone: {item.zone}</div>
        )}
        {/* Shape file data text display is now hidden via CSS, but still drawn on map */}
      </div>
      <div className="mini-map-container" ref={miniMapRef}>
        {/* Mini-map will be rendered here */}
      </div>
    </li>
  );
}


function RatesDetails({ properties }) {
  if (!properties || properties.length === 0) {
    return <p>No properties found for this user.</p>;
  }

  return (
    <div className="rates-details-content"> {/* This container will hold the list of property cards */}
      <div className="property-list-details"> {/* This will hold the individual property cards */}
        <ul>
          {properties.map((item) => (
            <PropertyItem key={item.id} item={item} />
          ))}
        </ul>
      </div>
      {/* The main map container is now removed from RatesDetails as it's replaced by mini-maps */}
    </div>
  );
}

export default RatesDetails;
