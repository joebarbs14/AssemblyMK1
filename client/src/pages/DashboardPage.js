import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css'; // Assuming you still use this for styling

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

function DashboardPage() {
  const [processes, setProcesses] = useState({});
  const [userName, setUserName] = useState('Resident');
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null); // Add error state for display
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, redirecting to login.');
      navigate('/#/'); // Navigate to base path which should lead to login
      return;
    }

    // Decode JWT to extract user name (remains good practice)
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(base64));
      if (decoded && decoded.name) {
        setUserName(decoded.name);
      } else {
        console.warn('Token decoded, but "name" claim is missing or invalid.');
        setUserName('Resident'); // Default back to 'Resident' if name is missing
      }
    } catch (err) {
      console.error('Invalid token format:', err);
      localStorage.removeItem('token'); // Token is bad, remove it
      navigate('/#/'); // Redirect to login
      return;
    }

    const fetchData = async () => {
      setLoading(true); // Start loading
      setError(null); // Clear previous errors
      try {
        const res = await fetch('https://assemblymk1-backend.onrender.com/dashboard/', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });

        if (!res.ok) {
          // If the response is not OK (e.g., 500, 401, 403), throw an error
          const errorData = await res.json().catch(() => ({ message: 'No error details from server.' }));
          console.error(`Dashboard fetch failed: Status ${res.status}, Message: ${errorData.message || errorData.error || 'Unknown error'}`);

          // Specific handling for 401/403: Token might be expired or invalid for authorization
          if (res.status === 401 || res.status === 403) {
            alert('Your session has expired or is invalid. Please log in again.');
            localStorage.removeItem('token');
            navigate('/#/');
            return; // Stop further execution
          }
          throw new Error(errorData.error || errorData.message || `Server responded with status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Dashboard data received:', data);
        setProcesses(data || {});
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        setError(`Failed to load dashboard data. ${error.message || 'Please try again.'}`);
        // Do NOT remove token and navigate unless it's a specific auth error
        // Keeping the user on the dashboard page with an error allows for retry
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchData();
  }, [navigate]); // Added navigate to dependency array for useEffect best practices

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
        <button onClick={() => window.location.reload()}>Retry</button> {/* Simple retry */}
        <p>If the problem persists, please try <span className="link" onClick={() => { localStorage.removeItem('token'); navigate('/#/'); }}>logging in again</span>.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {userName}</h1>
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
