// src/pages/WaterDetails.js (or src/components/WaterDetails.js)
import React from 'react';
import './DashboardPage.css'; // Re-use existing CSS for general card styling

function WaterDetails({ properties }) {
  if (!properties || properties.length === 0) {
    return <p>No properties found with water consumption data for this user.</p>;
  }

  return (
    <div className="water-details-content">
      <div className="property-list-details">
        {properties.map((property) => (
          <div key={property.id} className="property-item-card"> {/* Re-using property-item-card for consistency */}
            <div className="property-details-content">
              <div className="property-header">
                <div className="property-address-council">
                  <div className="property-title">Address: {property.address}</div>
                  {property.council_name && (
                    <div className="property-info">Council: {property.council_name}</div>
                  )}
                </div>
                {property.council_logo_url && (
                  <img src={property.council_logo_url} alt={`${property.council_name} Logo`} className="council-logo-small" />
                )}
              </div>

              {/* Property Type and other general info */}
              {property.property_type && (
                <div className="property-info">Type: {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}</div>
              )}
              {property.land_size_sqm && (
                <div className="property-info">Land Size: {property.land_size_sqm} m²</div>
              )}

              {/* Water Consumption Details */}
              <h4 className="water-section-title">Water Consumption History</h4>
              {property.water_consumptions && property.water_consumptions.length > 0 ? (
                <ul className="water-consumption-list">
                  {property.water_consumptions
                    .sort((a, b) => new Date(b.quarter_start_date) - new Date(a.quarter_start_date)) // Sort by most recent quarter first
                    .map((wc, idx) => {
                      const quarterDate = new Date(wc.quarter_start_date);
                      const year = quarterDate.getFullYear();
                      const quarter = Math.floor((quarterDate.getMonth() / 3)) + 1; // Calculate quarter (1-4)
                      const percentageConsumed = wc.allocated_litres > 0 ? (wc.consumed_litres / wc.allocated_litres) * 100 : 0;
                      const isOverAllocation = wc.consumed_litres > wc.allocated_litres;

                      return (
                        <li key={wc.id || idx} className="water-quarter-card">
                          <div className="quarter-header">
                            <span className="quarter-title">Quarter {quarter} {year}</span>
                            {wc.bill_due_date && (
                              <span className="bill-due-date">Due: {new Date(wc.bill_due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="consumption-details">
                            <div className="consumption-item">
                              Consumed: <span className="value">{wc.consumed_litres.toLocaleString()} L</span>
                            </div>
                            <div className="consumption-item">
                              Allocation: <span className="value">{wc.allocated_litres.toLocaleString()} L</span>
                            </div>
                            <div className={`consumption-item ${isOverAllocation ? 'over-allocation' : ''}`}>
                              Status: <span className="value">{isOverAllocation ? 'Over Allocation' : 'Within Allocation'}</span>
                            </div>
                            {wc.amount_owing != null && (
                              <div className="consumption-item">
                                Amount Owing: <span className="value">${wc.amount_owing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                          {/* Simple progress bar for visual representation */}
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar"
                              style={{ width: `${Math.min(100, percentageConsumed)}%`, backgroundColor: isOverAllocation ? '#dc3545' : '#28a745' }}
                            ></div>
                            <span className="progress-text">{percentageConsumed.toFixed(1)}%</span>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="no-entries">No water consumption data available for this property.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WaterDetails;
