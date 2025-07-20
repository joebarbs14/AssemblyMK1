import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import RatesDetails from './RatesDetails'; // Import the RatesDetails component
import WaterDetails from './WaterDetails'; // Import the new WaterDetails component

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

// Helper function to get emoji for each category
const getCategoryEmoji = (category) => {
  switch (category) {
    case "Rates": return "🏠";
    case "Water": return "💧";
    case "Development": return "🏗️";
    case "Community": return "🤝";
    case "Roads": return "🛣️";
    case "Waste": return "🗑️";
    case "Animals": return "🐾";
    case "Public Health": return "⚕️"; // Changed from 🏥 to ⚕️ for consistency with previous output
    case "Environment": return "🌳";
    default: return "✨";
  }
};

// Mock council logos (replace with actual URLs or integrate with backend)
// These should ideally come from the backend's /user/profile or a dedicated /council endpoint
const councilLogos = {
  "City of Sydney": "https://placehold.co/50x50/ADD8E6/000000?text=SYD", // Placeholder for City of Sydney
  "Northern Beaches Council": "https://placehold.co/50x50/90EE90/000000?text=NB", // Placeholder for Northern Beaches
  "Parramatta City Council": "https://placehold.co/50x50/FFD700/000000?text=PAR", // Placeholder for Parramatta
  "Blacktown City Council": "https://placehold.co/50x50/FFB6C1/000000?text=BT", // Placeholder for Blacktown
  "Wollongong City Council": "https://placehold.co/50x50/DDA0DD/000000?text=WOL", // Placeholder for Wollongong
  "Newcastle City Council": "https://placehold.co/50x50/87CEEB/000000?text=NEW", // Placeholder for Newcastle
  "Central Coast Council": "https://placehold.co/50x50/F08080/000000?text=CC", // Placeholder for Central Coast
  "Canterbury-Bankstown Council": "https://placehold.co/50x50/C0C0C0/000000?text=CB", // Placeholder for Canterbury-Bankstown
  "Liverpool City Council": "https://placehold.co/50x50/ADD8E6/000000?text=LIV", // Placeholder for Liverpool
  "Penrith City Council": "https://placehold.co/50x50/90EE90/000000?text=PEN", // Placeholder for Penrith
};


function DashboardPage() {
  const [processes, setProcesses] = useState({}); // This state will now hold processes, properties, and water data
  const [userName, setUserName] = useState('Resident');
  const [userCouncil, setUserCouncil] = useState(null); // New state for user's council
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null); // State for selected category
  const navigate = useNavigate();

  const fetchUserProfileAndDashboardData = useCallback(async (token) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user profile (name and council) using the token
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
          localStorage.removeItem('userCouncil'); // Clear council on logout
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

      // Assuming your /user/profile endpoint might return a 'council' field
      // This 'council' field should ideally be the council's name (e.g., "City of Sydney")
      // which can then be used to look up the logo.
      if (userProfileData.council) {
        setUserCouncil(userProfileData.council);
        localStorage.setItem('userCouncil', userProfileData.council);
        console.log('DashboardPage: User council fetched and set:', userProfileData.council);
      } else {
        console.warn('DashboardPage: User profile fetched, but "council" field is missing. Defaulting to null.');
        setUserCouncil(null); // Default if council is missing
      }

      // 2. Now fetch dashboard data (which includes properties for 'Rates' and 'Water')
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
          localStorage.removeItem('userCouncil'); // Clear council on logout
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
    const storedUserCouncil = localStorage.getItem('userCouncil'); // Get stored council

    if (storedUserName) {
      setUserName(storedUserName);
    }
    if (storedUserCouncil) { // Set council if found
      setUserCouncil(storedUserCouncil);
    }

    console.log('DashboardPage: Token retrieved from localStorage for useEffect:', token);

    if (!token) {
      console.warn('No token found, redirecting to login.');
      navigate('/#/');
      return;
    }

    fetchUserProfileAndDashboardData(token);

  }, [navigate, fetchUserProfileAndDashboardData]);

  // Handler for tile click
  const handleTileClick = (category) => {
    setSelectedCategory(category);
  };

  // Get items for the selected category
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
          <span className="link" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userName'); localStorage.removeItem('userCouncil'); navigate('/#/'); }}>
            log in again
          </span>.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-top-row"> {/* Use dashboard-top-row for overall top layout */}
        <div className="header-left">
          {userCouncil && councilLogos[userCouncil] && (
            <img src={councilLogos[userCouncil]} alt={`${userCouncil} Logo`} className="council-logo" />
          )}
          <h1 className="welcome-heading">Welcome, {userName}</h1>
        </div>
        
        <div className="tiles-inline-container"> {/* Container for tiles to allow horizontal scrolling if needed */}
          <div className="tiles">
            {categories.map(category => (
              <div
                key={category}
                className={`tile ${selectedCategory === category ? 'selected-tile' : ''}`}
                onClick={() => handleTileClick(category)}
              >
                <h3>
                  <span className="emoji">{getCategoryEmoji(category)}</span>
                  {category}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userCouncil'); // Clear council on logout
          navigate('/#/');
        }}>Logout</button>
      </div>

      {/* New section to display detailed information below the tiles */}
      {selectedCategory && (
        <div className="selected-category-details-container"> {/* Use the container for side-by-side layout */}
          <div className="selected-category-details">
            <h2>Details for {selectedCategory}</h2>
            {selectedCategoryItems.length > 0 ? (
              // Conditionally render RatesDetails, WaterDetails, or generic process details
              selectedCategory === 'Rates' ? (
                <RatesDetails properties={selectedCategoryItems} />
              ) : selectedCategory === 'Water' ? ( // NEW: Render WaterDetails for 'Water' category
                <WaterDetails properties={selectedCategoryItems} />
              ) : (
                <ul>
                  {selectedCategoryItems.map((item) => (
                    <li key={item.id} className="process-item-full-detail">
                      {/* Render details for generic processes */}
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
