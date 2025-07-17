import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

function DashboardPage() {
  const [processes, setProcesses] = useState({});
  const [userName, setUserName] = useState('Resident');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null); // New state for selected category
  const navigate = useNavigate();

  const fetchUserProfileAndDashboardData = useCallback(async (token) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user profile (name) using the token
      const userProfileRes = await fetch('https://assemblymk1-backend.onrender.com/user/profile', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      // Read user profile data once
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

      // 2. Now fetch dashboard data
      const dashboardRes = await fetch('https://assemblymk1-backend.onrender.com/dashboard/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });

      // Read dashboard response body ONLY ONCE
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
    if (storedUserName) {
      setUserName(storedUserName);
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
          <span className="link" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userName'); navigate('/#/'); }}>
            log in again
          </span>.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {userName}</h1>
        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          navigate('/#/');
        }}>Logout</button>
      </div>

      <div className="tiles">
        {categories.map(category => (
          <div
            key={category}
            className={`tile ${selectedCategory === category ? 'selected-tile' : ''}`}
            onClick={() => handleTileClick(category)} // Add onClick handler
          >
            <h3>{category}</h3>
            <ul>
              {/* Display a summary or first item in the tile */}
              {(processes[category] && processes[category].length > 0) ? (
                <li className="process-item-summary">
                  {processes[category][0].title}
                  {processes[category].length > 1 && ` (+${processes[category].length - 1} more)`}
                </li>
              ) : (
                <li className="no-items">No entries yet</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* New section to display detailed information below the tiles */}
      {selectedCategory && (
        <div className="selected-category-details">
          <h2>Details for {selectedCategory}</h2>
          {selectedCategoryItems.length > 0 ? (
            <ul>
              {selectedCategoryItems.map((item) => (
                <li key={item.id} className="process-item-full-detail">
                  <div className="process-title">{item.title}</div>
                  <div className="process-detail">Status: {item.status}</div>
                  {item.submitted_at && (
                    <div className="process-detail">Submitted: {new Date(item.submitted_at).toLocaleDateString()}</div>
                  )}
                  {item.updated_at && (
                    <div className="process-detail">Updated: {new Date(item.updated_at).toLocaleDateString()}</div>
                  )}
                  {/* You can add more details from item.form_data here if needed */}
                  {item.form_data && Object.keys(item.form_data).length > 0 && (
                    <div className="process-detail">
                      Form Data: {JSON.stringify(item.form_data)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No entries found for {selectedCategory}.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
