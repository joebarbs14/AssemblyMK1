import React, { useEffect, useState } from 'react';
import './DashboardPage.css';

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

function DashboardPage() {
  const [processes, setProcesses] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/dashboard', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      setProcesses(data);
    };
    fetchData();
  }, []);

  return (
    <div className="dashboard">
      <h1>Welcome to LocalGov</h1>
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