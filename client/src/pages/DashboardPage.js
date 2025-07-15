import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

// The decodeToken function is no longer needed for userName extraction
// as userName will be fetched from the /user/profile endpoint.
// However, if you use it elsewhere for other token claims, you can keep it.
// For this specific context, it's not directly used for setting userName.
/*
function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
}
*/

function DashboardPage() {
  const [processes, setProcesses] = useState({});
  const [userName, setUserName] = useState('Resident');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Use useCallback to memoize the fetch function, preventing unnecessary re-creations
  const fetchUserProfileAndDashboardData = useCallback(async (token) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user profile (name) using the token
      const userProfileRes = await fetch('https://assemblymk1-backend.onrender.com/user/profile', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!userProfileRes.ok) {
        console.error(`Failed to fetch user profile: Status ${userProfileRes.status}`);
        // If profile fetch fails due to auth, redirect to login
        if (userProfileRes.status === 401 || userProfileRes.status === 403) {
          alert('Your session has expired or is invalid. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('userName'); // Clear userName on logout
          navigate('/#/');
          return; // Exit early
        }
        throw new Error(`Server responded with status: ${userProfileRes.status} for user profile`);
      }

      const userProfileData = await userProfileRes.json();
      if (userProfileData.name) {
        setUserName(userProfileData.name);
        localStorage.setItem('userName', userProfileData.name); // Store it for future use
        console.log('DashboardPage: User name fetched and set:', userProfileData.name);
      } else {
        console.warn('DashboardPage: User profile fetched, but "name" field is missing.', userProfileData);
        setUserName('Resident'); // Default if name is missing from profile endpoint
      }

      // 2. Now fetch dashboard data
      const dashboardRes = await fetch('https://assemblymk1-backend.onrender.com/dashboard/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });

      const contentType = dashboardRes.headers.get('content-type');
      const dashboardErrorData = contentType?.includes('application/json') ? await dashboardRes.json() : {};

      if (!dashboardRes.ok) {
        console.error(`Dashboard fetch failed: Status ${dashboardRes.status}, Message: ${dashboardErrorData.message || dashboardErrorData.error || 'Unknown error'}`);
        if (dashboardRes.status === 401 || dashboardRes.status === 403) {
          alert('Your session has expired or is invalid. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('userName'); // Clear userName on logout
          navigate('/#/');
          return; // Exit early
        }
        throw new Error(dashboardErrorData.error || dashboardErrorData.message || `Server responded with status: ${dashboardRes.status} for dashboard data`);
      }

      const dashboardData = await dashboardRes.json(); // This is the variable name
      console.log('Dashboard data received:', dashboardData);
      setProcesses(typeof dashboardData === 'object' && dashboardData !== null ? dashboardData : {}); // <<< FIXED THIS LINE

    } catch (err) {
      console.error('DashboardPage: Error during data fetch:', err);
      setError(`Failed to load dashboard data. ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  }, [navigate]); // Add navigate to useCallback dependencies

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Try to get userName from localStorage first to avoid flicker
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

    // Call the memoized fetch function
    fetchUserProfileAndDashboardData(token);

  }, [navigate, fetchUserProfileAndDashboardData]); // Add fetchUserProfileAndDashboardData to dependencies

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
          localStorage.removeItem('userName'); // Clear userName on logout
          navigate('/#/');
        }}>Logout</button>
      </div>

      <div className="tiles">
        {categories.map(category => (
          <div key={category} className="tile">
            <h3>{category}</h3>
            <ul>
              {(processes[category] || []).map((title, idx) => (
                <li key={idx}>{title}</li>
              ))}
              {(!processes[category] || processes[category].length === 0) && (
                <li className="no-items">No entries yet</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
