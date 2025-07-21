import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet'; // Import Leaflet library
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS (make sure it's accessible in public/)
import './DashboardPage.css'; // Re-use existing CSS for general card/button styling

// Fix for default marker icon issues with Webpack/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function WasteDetails({ wasteData }) {
  const [selectedWasteType, setSelectedWasteType] = useState('Garbage');
  const mapRef = useRef(null); // Ref for the map container
  const leafletMapRef = useRef(null); // Ref for the Leaflet map instance
  const geoJsonLayerRef = useRef(null); // Ref for the GeoJSON layer

  // Filter waste data by type
  const getWasteTypeData = (type) => {
    return wasteData.filter(item => item.collection_type === type);
  };

  const garbageData = getWasteTypeData('Garbage');
  const recyclingData = getWasteTypeData('Recycling');
  const greenwasteData = getWasteTypeData('Greenwaste');
  const repurposeData = getWasteTypeData('Repurpose');

  // Effect for map initialization and updates
  useEffect(() => {
    if (selectedWasteType === 'Garbage' && garbageData.length > 0) {
      const { route_geojson } = garbageData[0]; // Assuming first garbage entry has the route

      if (!leafletMapRef.current && mapRef.current) {
        // Initialize map only once
        leafletMapRef.current = L.map(mapRef.current).setView([-33.8688, 151.2093], 13); // Default to Sydney
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMapRef.current);
      }

      const map = leafletMapRef.current;

      // Clear previous GeoJSON layer if it exists
      if (geoJsonLayerRef.current) {
        map.removeLayer(geoJsonLayerRef.current);
      }

      if (route_geojson) {
        try {
          // Add new GeoJSON layer
          geoJsonLayerRef.current = L.geoJson(route_geojson, {
            style: (feature) => {
              return {
                color: '#ff7800',
                weight: 5,
                opacity: 0.65
              };
            }
          }).addTo(map);

          // Fit map to GeoJSON bounds
          map.fitBounds(geoJsonLayerRef.current.getBounds());
        } catch (e) {
          console.error("Error loading GeoJSON:", e);
        }
      } else {
        // If no route_geojson, set a default view or message
        map.setView([-33.8688, 151.2093], 13); // Default to Sydney
      }
    }
  }, [selectedWasteType, garbageData]); // Re-run when selectedWasteType or garbageData changes

  const handleWasteActionClick = (type) => {
    setSelectedWasteType(type);
  };

  return (
    <div className="waste-details-content">
      <h3 className="waste-section-title">Waste Services</h3>
      <div className="waste-action-buttons">
        <div
          className={`waste-action-tile ${selectedWasteType === 'Garbage' ? 'selected-action-tile' : ''}`}
          onClick={() => handleWasteActionClick('Garbage')}
        >
          <span className="emoji">🗑️</span> Garbage
        </div>
        <div
          className={`waste-action-tile ${selectedWasteType === 'Recycling' ? 'selected-action-tile' : ''}`}
          onClick={() => handleWasteActionClick('Recycling')}
        >
          <span className="emoji">♻️</span> Recycling
        </div>
        <div
          className={`waste-action-tile ${selectedWasteType === 'Greenwaste' ? 'selected-action-tile' : ''}`}
          onClick={() => handleWasteActionClick('Greenwaste')}
        >
          <span className="emoji">🌿</span> Greenwaste
        </div>
        <div
          className={`waste-action-tile ${selectedWasteType === 'Repurpose' ? 'selected-action-tile' : ''}`}
          onClick={() => handleWasteActionClick('Repurpose')}
        >
          <span className="emoji">🔄</span> Repurpose
        </div>
      </div>

      {selectedWasteType === 'Garbage' && (
        <div className="waste-type-details">
          <h4 className="listing-title">Garbage Collection</h4>
          {garbageData.length > 0 ? (
            <>
              <p className="collection-info">
                Next Collection: {new Date(garbageData[0].next_collection_date).toLocaleDateString()} ({garbageData[0].collection_day}, {garbageData[0].collection_frequency})
              </p>
              {garbageData[0].notes && (
                <p className="collection-notes">Notes: {garbageData[0].notes}</p>
              )}
              <div id="garbage-map" ref={mapRef} className="waste-map-container"></div>
            </>
          ) : (
            <p className="no-entries">No garbage collection information available for your area.</p>
          )}
        </div>
      )}

      {selectedWasteType === 'Recycling' && (
        <div className="waste-type-details">
          <h4 className="listing-title">Recycling Collection</h4>
          {recyclingData.length > 0 ? (
            <>
              <p className="collection-info">
                Next Collection: {new Date(recyclingData[0].next_collection_date).toLocaleDateString()} ({recyclingData[0].collection_day}, {recyclingData[0].collection_frequency})
              </p>
              {recyclingData[0].notes && (
                <p className="collection-notes">Notes: {recyclingData[0].notes}</p>
              )}
            </>
          ) : (
            <p className="no-entries">No recycling collection information available for your area.</p>
          )}
        </div>
      )}

      {selectedWasteType === 'Greenwaste' && (
        <div className="waste-type-details">
          <h4 className="listing-title">Greenwaste Collection</h4>
          {greenwasteData.length > 0 ? (
            <>
              <p className="collection-info">
                Next Collection: {new Date(greenwasteData[0].next_collection_date).toLocaleDateString()} ({greenwasteData[0].collection_day}, {greenwasteData[0].collection_frequency})
              </p>
              {greenwasteData[0].notes && (
                <p className="collection-notes">Notes: {greenwasteData[0].notes}</p>
              )}
            </>
          ) : (
            <p className="no-entries">No greenwaste collection information available for your area.</p>
          )}
        </div>
      )}

      {selectedWasteType === 'Repurpose' && (
        <div className="waste-type-details">
          <h4 className="listing-title">Repurpose & Special Waste</h4>
          {repurposeData.length > 0 ? (
            <>
              <p className="collection-info">
                Next Collection: {new Date(repurposeData[0].next_collection_date).toLocaleDateString()} ({repurposeData[0].collection_day}, {repurposeData[0].collection_frequency})
              </p>
              {repurposeData[0].notes && (
                <p className="collection-notes">Notes: {repurposeData[0].notes}</p>
              )}
              <p className="collection-info">
                For more details on repurposing, visit your council's website or contact them directly.
              </p>
            </>
          ) : (
            <p className="no-entries">No repurpose collection information available for your area.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default WasteDetails;
