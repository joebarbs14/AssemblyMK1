import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
}

function DashboardPage() {
  const [processes, setProcesses] = useState({});
  const [userName, setUserName] = useState('Resident');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    // <<< ADDED CONSOLE.LOG TO CONFIRM TOKEN RETRIEVAL >>>
    console.log('DashboardPage: Token retrieved from localStorage:', token);

    if (!token) {
      console.warn('No token found, redirecting to login.');
      navigate('/#/');
      return;
    }

    const decoded = decodeToken(token);
    // Corrected: Access 'name' from within the 'sub' object [cite: user's previous conversation]
    if (decoded?.sub?.name) { // <<< CHANGED THIS LINE
      setUserName(decoded.sub.name); // <<< CHANGED THIS LINE
    } else {
      console.warn('Decoded token missing "name" field in "sub" object. Defaulting name to "Resident".', decoded); // Added 'decoded' for more context
      setUserName('Resident');
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('https://assemblymk1-backend.onrender.com/dashboard/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json', // Good practice to include
            'Authorization': 'Bearer ' + token // Ensure token is not undefined here
          }
        });

        const contentType = res.headers.get('content-type');
        const errorData = contentType?.includes('application/json') ? await res.json() : {};

        if (!res.ok) {
          console.error(`Dashboard fetch failed: Status ${res.status}, Message: ${errorData.message || errorData.error || 'Unknown error'}`);
          if (res.status === 401 || res.status === 403) {
            alert('Your session has expired or is invalid. Please log in again.');
            localStorage.removeItem('token');
            navigate('/#/');
            return;
          }
          throw new Error(errorData.error || errorData.message || `Server responded with status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Dashboard data received:', data);
        setProcesses(typeof data === 'object' && data !== null ? data : {});
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        setError(`Failed to load dashboard data. ${error.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]); // Dependency array

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
          <span className="link" onClick={() => { localStorage.removeItem('token'); navigate('/#/'); }}>
            log in again
          </span>.
        </p>
      </div>
    );
  );
}

export default DashboardPage;
