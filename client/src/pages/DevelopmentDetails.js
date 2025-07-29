// src/pages/DevelopmentDetails.js (or src/components/DevelopmentDetails.js)
import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure Leaflet CSS is imported

// Fix for default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function DevelopmentApplicationItem({ application }) {
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      }).addTo(miniMapInstance.current);
    }

    const map = miniMapInstance.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = [];

    if (application.gps_coordinates && typeof application.gps_coordinates === 'object' && application.gps_coordinates.lat != null && application.gps_coordinates.lon != null) {
      const latLng = [application.gps_coordinates.lat, application.gps_coordinates.lon];
      L.marker(latLng).addTo(map);
      bounds.push(latLng);
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [10, 10], maxZoom: 16 });
    } else {
      map.setView([-33.8688, 151.2093], 12); // Default to Sydney if no coordinates
    }

    map.invalidateSize();

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [application]);

  return (
    <li className="development-item-card">
      <div className="development-details-content">
        <div className="development-header">
          <div className="development-title-info">
            <div className="development-title">{application.application_type} Application</div>
            {application.property_address && (
              <div className="development-info">Property: {application.property_address}</div>
            )}
            {application.council_name && (
              <div className="development-info">Council: {application.council_name}</div>
            )}
          </div>
          {application.council_logo_url && (
            <img src={application.council_logo_url} alt={`${application.council_name} Logo`} className="council-logo-small" />
          )}
        </div>

        <div className="development-info">Status: <span className={`status-${application.status.toLowerCase().replace(/\s/g, '-')}`}>{application.status}</span></div>
        {application.submission_date && (
          <div className="development-info">Submitted: {new Date(application.submission_date).toLocaleDateString()}</div>
        )}
        {application.approval_date && (
          <div className="development-info">Approved: {new Date(application.approval_date).toLocaleDateString()}</div>
        )}
        {application.estimated_cost != null && (
          <div className="development-info">Estimated Cost: ${application.estimated_cost.toLocaleString()}</div>
        )}
        {application.description && (
          <div className="development-info">Description: {application.description}</div>
        )}
        {application.documents_url && application.documents_url.length > 0 && (
          <div className="development-info">
            Documents:
            <ul>
              {application.documents_url.map((doc, idx) => (
                <li key={idx}><a href={doc} target="_blank" rel="noopener noreferrer">Document {idx + 1}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mini-map-container" ref={miniMapRef}>
        {/* Mini-map will be rendered here */}
      </div>
    </li>
  );
}

function DevelopmentDetails({ applications }) {
  if (!applications || applications.length === 0) {
    return <p className="no-entries">No development applications found for this user.</p>;
  }

  return (
    <div className="development-details-content">
      <ul className="development-applications-list">
        {applications.map((app) => (
          <DevelopmentApplicationItem key={app.id} application={app} />
        ))}
      </ul>
    </div>
  );
}

export default DevelopmentDetails;
