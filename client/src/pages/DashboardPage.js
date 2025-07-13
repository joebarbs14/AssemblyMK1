import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

function DashboardPage() {
  const [processes, setProcesses] = useState({});
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/');
      return;
    }

    // Decode token to extract user info
    const base64Url = token.split('.')[1];
    try {
      const decoded = JSON.parse(atob(base64Url));
      setUserName(decoded.name || 'Resident'); // fallback if name is missing
    } catch (err) {
      console.error('Invalid token:', err);
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/dashboard', {
          headers: { Authorization: 'Bearer ' + token }
        });

        if (!res.ok) {
          throw new Error('Unauthorized or failed to fetch');
        }

        const data = await res.json();
        setProcesses(data);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        localStorage.removeItem('token');
        navigate('/');
      }
    };

    fetchData();
  }, [navigate]);

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
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
