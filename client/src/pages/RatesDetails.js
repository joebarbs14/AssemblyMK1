// src/pages/RatesDetails.js (or src/components/RatesDetails.js)
import React from 'react';
import './DashboardPage.css'; // Assuming DashboardPage.css has the necessary styles

function RatesDetails({ properties }) {
  if (!properties || properties.length === 0) {
    return <p>No properties found for this user.</p>;
  }

  return (
    <ul>
      {properties.map((item) => (
        <li key={item.id} className="process-item-full-detail">
          <>
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
              <div className="process-detail">GPS: {typeof item.gps_coordinates === 'object' ? `Lat: ${item.gps_coordinates.lat}, Lon: ${item.gps_coordinates.lon}` : item.gps_coordinates}</div>
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
            {/* Map will go here in a later iteration */}
          </>
        </li>
      ))}
    </ul>
  );
}

export default RatesDetails;
