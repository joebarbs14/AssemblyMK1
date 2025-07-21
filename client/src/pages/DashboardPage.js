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
    case "Public Health": return "⚕️";
    case "Environment": return "🌲"; // Changed from '?' to '🌳' to fix syntax error
    default: return "✨";
  }
};

// REMOVED: Mock council logos (will now come from backend)
// const councilLogos = { ... };


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
          localStorage.removeItem('userCouncilName');
          localStorage.removeItem('userCouncilLogoUrl');
          navigate('/#/');
        }}>Logout</button>
      </div>

      {selectedCategory && (
        <div className="selected-category-details-container">
          <div className="selected-category-details">
            <h2>Details for {selectedCategory}</h2>
            {selectedCategoryItems.length > 0 || selectedCategory === 'Animals' || selectedCategory === 'Waste' ? (
              selectedCategory === 'Rates' ? (
                <RatesDetails properties={selectedCategoryItems} />
              ) : selectedCategory === 'Water' ? (
                <WaterDetails properties={selectedCategoryItems} />
              ) : selectedCategory === 'Animals' ? (
                <AnimalDetails animals={selectedCategoryItems} />
              ) : selectedCategory === 'Waste' ? (
                <WasteDetails wasteData={selectedCategoryItems} /> {/* Pass wasteData to WasteDetails */}
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
