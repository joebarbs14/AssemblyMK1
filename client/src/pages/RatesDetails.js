// src/pages/RatesDetails.js (or src/components/RatesDetails.js)
import React, { useEffect, useRef } from 'react';
import L from 'leaflet'; // Import Leaflet library
import './DashboardPage.css'; // Assuming DashboardPage.css has the necessary styles

// Fix for default Leaflet icon paths (important for Webpack/CRA builds)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function RatesDetails({ properties }) {
  // Use useRef to persist the map instance across renders
  const mapRef = useRef(null);
  const mapInstance = useRef(null); // To store the actual Leaflet map object

  useEffect(() => {
    if (!mapRef.current) return; // Ensure the map container div exists

    // Initialize the map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [-33.8688, 151.2093], // Default center (Sydney)
        zoom: 12,
        zoomControl: false // We can add a custom one if needed
      });

      // Add a tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;

    // Clear existing layers (markers, polygons) before adding new ones
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = []; // To calculate the bounding box for all properties

    properties.forEach(property => {
      // Add marker for GPS coordinates
      if (property.gps_coordinates && typeof property.gps_coordinates === 'object' && property.gps_coordinates.lat && property.gps_coordinates.lon) {
        const latLng = [property.gps_coordinates.lat, property.gps_coordinates.lon];
        L.marker(latLng)
          .addTo(map)
          .bindPopup(`<b>${property.address}</b><br>Type: ${property.property_type}<br>Council: ${property.council_name}`)
          .openPopup();
        bounds.push(latLng);
      }

      // Add shape file data (GeoJSON)
      if (property.shape_file_data) {
        try {
          const geoJsonData = JSON.parse(property.shape_file_data);
          const geoJsonLayer = L.geoJSON(geoJsonData, {
            style: {
              color: '#ff7800',
              weight: 3,
              opacity: 0.65,
              fillOpacity: 0.2,
              fillColor: '#ff7800'
            },
            onEachFeature: (feature, layer) => {
              // Bind popup to shape layer if needed
              layer.bindPopup(`<b>${property.address}</b><br>Zone: ${property.zone}`);
            }
          }).addTo(map);

          // Extend bounds to include shape data
          if (geoJsonLayer.getBounds) {
            bounds.push(geoJsonLayer.getBounds());
          }
        } catch (e) {
          console.error("Error parsing shape_file_data for property:", property.id, e);
        }
      }
    });

    // Fit map to bounds of all properties, if any
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] }); // Add some padding
    } else {
      // If no properties, reset to default center/zoom
      map.setView([-33.8688, 151.2093], 12);
    }

    // Cleanup function: remove map instance when component unmounts
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [properties]); // Rerun effect when properties change

  if (!properties || properties.length === 0) {
    return <p>No properties found for this user.</p>;
  }

  return (
    <div className="rates-details-content"> {/* New container for details and map */}
      <div className="property-list-details"> {/* Left side: Property details */}
        <ul>
          {properties.map((item) => (
            <li key={item.id} className="process-item-full-detail">
              <div className="property-header">
                <div className="property-address-council">
                  <div className="process-title">Address: {item.address}</div>
                  {item.council_name && (
                    <div className="process-detail">Council: {item.council_name}</div>
                  )}
                </div>
                {item.council_logo_url && (
                  <img src={item.council_logo_url} alt={`${item.council_name} Logo`} className="council-logo-small" />
                )}
              </div>

              {item.property_type && (
                <div className="process-detail">Type: {item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1)}</div>
              )}
              {item.gps_coordinates && (
                <div className="process-detail">GPS: {typeof item.gps_coordinates === 'object' ? `Lat: ${item.gps_coordinates.lat}, Lon: ${item.gps_coordinates.lon}` : JSON.stringify(item.gps_coordinates)}</div>
              )}
              {item.land_size_sqm && (
                <div className="process-detail">Land Size: {item.land_size_sqm} m²</div>
              )}
              {item.property_value && (
                <div className="process-detail">Property Value: ${item.property_value.toLocaleString()}</div>
              )}
              {item.land_value && (
                <div className="process-detail">Land Value: ${item.land_value.toLocaleString()}</div>
              )}
              {item.zone && (
                <div className="process-detail">Zone: {item.zone}</div>
              )}
              {item.shape_file_data && (
                <div className="process-detail">Shape File Data: {item.shape_file_data}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="map-container" ref={mapRef}> {/* Right side: Map */}
        {/* Map will be initialized here by Leaflet */}
      </div>
    </div>
  );
}

export default RatesDetails;
