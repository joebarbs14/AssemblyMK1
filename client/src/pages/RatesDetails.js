// src/pages/RatesDetails.js (or src/components/RatesDetails.js)
import React from 'react';
import '.././DashboardPage.css'; // Assuming DashboardPage.css has the necessary styles

function RatesDetails({ properties }) {
  if (!properties || properties.length === 0) {
    return <p>No properties found for this user.</p>;
  }

  return (
    <ul>
      {properties.map((item) => (
        <li key={item.id} className="process-item-full-detail">
          {/* Conditionally render details based on item type (though here we expect 'property') */}
          <>
            <div className="process-title">Address: {item.address}</div>
            <div className="process-detail">Council: {item.council}</div>
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
          </>
        </li>
      ))}
    </ul>
  );
}

export default RatesDetails;
