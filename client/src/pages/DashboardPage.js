// DashboardPage.js - Version 1.0.7 - Cleaned to fix persistent build issues
console.log("DashboardPage.js - Version 1.0.7 - Loading...");

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import RatesDetails from './RatesDetails'; // Import the RatesDetails component
import WaterDetails from './WaterDetails'; // Import the WaterDetails component
import AnimalDetails from './AnimalDetails'; // Import the new AnimalDetails component
import WasteDetails from './WasteDetails'; // Import the new WasteDetails component

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

// Helper function to get SVG icon for each category
const getCategoryIcon = (category) => {
  const iconStyle = { width: '24px', height: '24px', fill: 'currentColor' }; // Common style for icons

  switch (category) {
    case "Rates": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.382L19.618 12H17v6h-4v-6h-2v6H7v-6H4.382L12 5.382z"/>
      </svg>
    );
    case "Water": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17c-3.87 0-7-3.13-7-7 0-2.22 1.03-4.2 2.65-5.59L12 4.38l4.35 4.03C14.97 9.8 14 11.78 14 14c0 3.87-3.13 7-7 7z"/>
      </svg>
    );
    case "Development": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M17 17h-2v-4h-2v4h-2V7h2V3h2v4h2v10zm-6 0H9v-4H7v4H5V7h2V3h2v4h2v10z"/>
      </svg>
    );
    case "Community": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S13.66 5 12 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm8 2h-2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
      </svg>
    );
    case "Roads": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M18 4h-2v2h2V4zm-2 4h-2v2h2V8zm-2 4h-2v2h2v-2zm-2 4h-2v2h2v-2zM4 22h16V2H4v20zm2-4h12V6H6v12z"/>
      </svg>
    );
    case "Waste": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M16 9h-3V5h-2v4H8l-4 4v2h16v-2l-4-4zM9 16H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
      </svg>
    );
    case "Animals": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2c-3.87 0-7 3.13-7 7 0 2.22 1.03 4.2 2.65 5.59L12 22l4.35-7.41C14.97 13.2 14 11.22 14 9c0-3.87-3.13-7-7-7zM8 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
      </svg>
    );
    case "Public Health": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>
    );
    case "Environment": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M17.66 17.66C15.9 19.42 13.45 20 12 20s-3.9-1.58-5.66-3.34C4.58 14.9 4 12.45 4 11c0-1.45.58-3.9 2.34-5.66C8.1 3.58 10.55 3 12 3s3.9 1.58 5.66 3.34C19.42 8.1 20 10.55 20 12c0 1.45-.58 3.9-2.34 5.66zM12 5c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
      </svg>
    );
    default: return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    );
  }
};


function DashboardPage() {
  const [processes, setProcesses] = useState({});
  const [userName, setUserName] = useState('Resident');
  const [userCouncilName, setUserCouncilName] = useState(null); // Renamed for clarity
  const [userCouncilLogoUrl, setUserCouncilLogoUrl] = useState(null); // New state for logo URL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  const fetchUserProfileAndDashboardData = useCallback(async (token) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user profile (name, council name, and council logo URL)
      const userProfileRes = await fetch('https://assemblymk1-backend.onrender.com/user/profile', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      const userProfileContentType = userProfileRes.headers.get('content-type');
      let userProfileData = {};

      if (userProfileContentType?.includes('application/json')) {
          userProfileData = await userProfileRes.json();
      }

      if (!userProfileRes.ok) {
        console.error(`Failed to fetch user profile: Status ${userProfileRes.status}, Message: ${userProfileData.message || userProfileData.error || 'Unknown error'}`);
        if (userProfileRes.status === 401 || userProfileRes.status === 403) {
          alert('Your session has expired or is invalid. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userCouncilName'); // Clear old council name
          localStorage.removeItem('userCouncilLogoUrl'); // Clear old logo URL
          navigate('/#/');
          return;
        }
        throw new Error(`Server responded with status: ${userProfileRes.status} for user profile`);
      }

      if (userProfileData.name) {
        setUserName(userProfileData.name);
        localStorage.setItem('userName', userProfileData.name);
        console.log('DashboardPage: User name fetched and set:', userProfileData.name);
      } else {
        console.warn('DashboardPage: User profile fetched, but "name" field is missing.', userProfileData);
        setUserName('Resident');
      }

      // Update state and local storage with council name and logo URL
      if (userProfileData.council_name) {
        setUserCouncilName(userProfileData.council_name);
        localStorage.setItem('userCouncilName', userProfileData.council_name);
        console.log('DashboardPage: User council name fetched and set:', userProfileData.council_name);
      } else {
        console.warn('DashboardPage: User profile fetched, but "council_name" field is missing. Defaulting to null.');
        setUserCouncilName(null);
      }

      if (userProfileData.council_logo_url) {
        setUserCouncilLogoUrl(userProfileData.council_logo_url);
        localStorage.setItem('userCouncilLogoUrl', userProfileData.council_logo_url);
        console.log('DashboardPage: User council logo URL fetched and set:', userProfileData.council_logo_url);
      } else {
        console.warn('DashboardPage: User profile fetched, but "council_logo_url" field is missing. Defaulting to null.');
        setUserCouncilLogoUrl(null);
      }

      // 2. Now fetch dashboard data (which includes properties, animals, waste etc.)
      const dashboardRes = await fetch('https://assemblymk1-backend.onrender.com/dashboard/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });

      const dashboardContentType = dashboardRes.headers.get('content-type');
      let dashboardResultData = {};

      if (dashboardContentType?.includes('application/json')) {
          dashboardResultData = await dashboardRes.json();
      }

      if (!dashboardRes.ok) {
        console.error(`Dashboard fetch failed: Status ${dashboardRes.status}, Message: ${dashboardResultData.message || dashboardResultData.error || 'Unknown error'}`);
        if (dashboardRes.status === 401 || dashboardRes.status === 403) {
          alert('Your session has expired or is invalid. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userCouncilName');
          localStorage.removeItem('userCouncilLogoUrl');
          navigate('/#/');
          return;
        }
        throw new Error(dashboardResultData.error || dashboardResultData.message || `Server responded with status: ${dashboardRes.status} for dashboard data`);
      }

      console.log('Dashboard data received:', dashboardResultData);
      setProcesses(typeof dashboardResultData === 'object' && dashboardResultData !== null ? dashboardResultData : {});

    } catch (err) {
      console.error('DashboardPage: Error during data fetch:', err);
      setError(`Failed to load dashboard data. ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserName = localStorage.getItem('userName');
    const storedUserCouncilName = localStorage.getItem('userCouncilName');
    const storedUserCouncilLogoUrl = localStorage.getItem('userCouncilLogoUrl');

    if (storedUserName) {
      setUserName(storedUserName);
    }
    if (storedUserCouncilName) {
      setUserCouncilName(storedUserCouncilName);
    }
    if (storedUserCouncilLogoUrl) {
      setUserCouncilLogoUrl(storedUserCouncilLogoUrl);
    }

    console.log('DashboardPage: Token retrieved from localStorage for useEffect:', token);

    if (!token) {
      console.warn('No token found, redirecting to login.');
      navigate('/#/');
      return;
    }

    fetchUserProfileAndDashboardData(token);

  }, [navigate, fetchUserProfileAndDashboardData]);

  const handleTileClick = (category) => {
    setSelectedCategory(category);
  };

  const selectedCategoryItems = selectedCategory ? (processes[selectedCategory] || []) : [];

  if (loading) {
    return (
      <div className="dashboard">
        <h1>Loading Dashboard...</h1>
        <p>Please wait while we fetch your data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <h1>Error Loading Dashboard</h1>
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        <p>
          If the problem persists, please{' '}
          <span className="link" onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('userName');
            localStorage.removeItem('userCouncilName');
            localStorage.removeItem('userCouncilLogoUrl');
            navigate('/#/');
          }}>
            log in again
          </span>.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-top-row">
        <div className="header-left">
          {userCouncilLogoUrl ? ( // Use userCouncilLogoUrl state
            <img src={userCouncilLogoUrl} alt={`${userCouncilName || 'Council'} Logo`} className="council-logo" />
          ) : (
            // Optional: Placeholder if no logo is available
            <div className="council-logo-placeholder"></div>
          )}
          <h1 className="welcome-heading">Welcome, {userName}</h1>
        </div>
        
        <div className="tiles-inline-container">
          <div className="tiles">
            {categories.map(category => (
              <div
                key={category}
                className={`tile ${selectedCategory === category ? 'selected-tile' : ''}`}
                onClick={() => handleTileClick(category)}
              >
                <h3>
                  <span className="icon">{getCategoryIcon(category)}</span>
                  {category}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userCouncilName');
          localStorage.removeItem('userCouncilLogoUrl');
          navigate('/#/');
        }}>Logout</button>
      </div>

      {selectedCategory && (
        <div className="selected-category-details-container">
          <div className="selected-category-details">
            <h2>Details for {selectedCategory}</h2>
            {/* Conditional rendering for category details */}
            {selectedCategoryItems.length > 0 || selectedCategory === 'Animals' || selectedCategory === 'Waste' ? (
              selectedCategory === 'Rates' ? (
                <RatesDetails properties={selectedCategoryItems} />
              ) : selectedCategory === 'Water' ? (
                <WaterDetails properties={selectedCategoryItems} />
              ) : selectedCategory === 'Animals' ? (
                <AnimalDetails animals={selectedCategoryItems} />
              ) : selectedCategory === 'Waste' ? (
                <WasteDetails wasteData={selectedCategoryItems} />
              ) : (
                <ul>
                  {selectedCategoryItems.map((item) => (
                    <li key={item.id} className="process-item-full-detail">
                      <>
                        <div className="process-title">{item.title}</div>
                        <div className="process-detail">Status: {item.status}</div>
                        {item.submitted_at && (
                          <div className="process-detail">Submitted: {new Date(item.submitted_at).toLocaleDateString()}</div>
                        )}
                        {item.updated_at && (
                          <div className="process-detail">Updated: {new Date(item.updated_at).toLocaleDateString()}</div>
                        )}
                        {item.form_data && Object.keys(item.form_data).length > 0 && (
                          <div className="process-detail">
                            Form Data: {JSON.stringify(item.form_data)}
                          </div>
                        )}
                      </>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="no-entries">No entries found for {selectedCategory}.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
