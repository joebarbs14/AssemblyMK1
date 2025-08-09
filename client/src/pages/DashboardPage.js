import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import RatesDetails from './RatesDetails';
import WaterDetails from './WaterDetails';
import AnimalDetails from './AnimalDetails';
import WasteDetails from './WasteDetails';
import DevelopmentDetails from './DevelopmentDetails';

// New component for Environment details
const EnvironmentDetails = ({ selectedSubCategory, data }) => {
  // Mock data for demonstration purposes
  const mockData = {
    "Nature": [
      { id: 1, title: "Local Flora Guide", description: "Information about native plants in the region." },
      { id: 2, title: "Fauna Spotting", description: "Learn where to spot native animals." }
    ],
    "Walking Tracks": [
      { id: 1, title: "Riverside Trail", length: "5km", difficulty: "Easy" },
      { id: 2, title: "Mountain Vista Loop", length: "12km", difficulty: "Moderate" }
    ],
    "National Parks": [
      { id: 1, title: "Greenwood National Park", description: "A beautiful park with hiking trails and picnic areas." },
      { id: 2, title: "Stone Creek Conservation Area", description: "Home to unique rock formations and wildlife." }
    ],
    "Weed Spotting": [
      { id: 1, title: "Declared Weeds", description: "A list of priority weeds and how to report them." },
      { id: 2, title: "Weed Control Programs", description: "Information on local control initiatives." }
    ],
    "Wildlife": [
      { id: 1, title: "Wildlife Rescue Contacts", description: "Emergency numbers for injured wildlife." },
      { id: 2, title: "Protecting Endangered Species", description: "Local projects and how to get involved." }
    ],
    "Trees": [
      { id: 1, title: "Tree Removal Permits", description: "Information on the process for removing trees on private property." },
      { id: 2, title: "Urban Forest Strategy", description: "Our plan for managing and growing the city's tree canopy." }
    ],
    "Water": [
      { id: 1, title: "Water Quality Monitoring", description: "Real-time data on local waterways." },
      { id: 2, title: "Stormwater Management", description: "Projects to improve stormwater quality." }
    ]
  };

  const selectedData = mockData[selectedSubCategory] || [];

  return (
    <div className="sub-details-content">
      {selectedSubCategory ? (
        <>
          <h3 className="sub-details-title">{selectedSubCategory}</h3>
          {selectedData.length > 0 ? (
            <ul className="sub-details-list">
              {selectedData.map((item) => (
                <li key={item.id} className="process-item-full-detail">
                  <div className="process-title">{item.title}</div>
                  <div className="process-detail">{item.description || `Length: ${item.length}, Difficulty: ${item.difficulty}`}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-entries">No entries found for {selectedSubCategory}.</p>
          )}
        </>
      ) : (
        <p className="no-entries">Please select an environment sub-category to view details.</p>
      )}
    </div>
  );
};


// DashboardPage.js - Version 1.0.14 - Environment Sub-tiles
console.log("DashboardPage.js - Version 1.0.14 - Loading...");

const categories = [
  "Rates", "Water", "Development", "Community",
  "Roads", "Waste", "Animals", "Public Health", "Environment"
];

const communitySubCategories = [
  "Community News", "Community Groups", "Community Services", "Local Events"
];

const roadSubCategories = [
  "Current Road works", "Upcoming Roadworks", "Report a problem"
];

const publicHealthSubCategories = [
  "Medical Services", "Resources", "Mental Health"
];

const environmentSubCategories = [
  "Nature", "Walking Tracks", "National Parks", "Weed Spotting", "Wildlife", "Trees", "Water"
];

// Helper function to get SVG icon for each category and sub-category
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
    case "Community":
    case "Community Groups": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S13.66 5 12 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm8 2h-2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
      </svg>
    );
    case "Community News": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M21 15h-9v-2h9v2zm0-4h-9V9h9v2zm0-4h-9V5h9v2zm-9 12h-9v-2h9v2zm0-4h-9v-2h9v2zm0-4h-9V9h9v2zM3 3h9v2h-9V3z"/>
      </svg>
    );
    case "Community Services": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-2.97 1.62-5.55 4-6.92V12h3v1.93l-3 3v2.5z"/>
      </svg>
    );
    case "Local Events": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    );
    case "Roads": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M18 4h-2v2h2V4zm-2 4h-2v2h2V8zm-2 4h-2v2h2v-2zm-2 4h-2v2h2v-2zM4 22h16V2H4v20zm2-4h12V6H6v12z"/>
      </svg>
    );
    case "Current Road works": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M10 18h4v-2h-4v2zM3 4v2h18V4H3zm3 7h12v2H6v-2z"/>
      </svg>
    );
    case "Upcoming Roadworks": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    );
    case "Report a problem": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
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
    case "Public Health":
    case "Medical Services": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>
    );
    case "Resources": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 11.55l-5.63 2.81 1.07-6.23-4.54-4.41 6.26-.91L12 0l2.84 5.67 6.26.91-4.54 4.41 1.07 6.23z"/>
      </svg>
    );
    case "Mental Health": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2c-4.97 0-9 4.03-9 9 0 4.17 2.84 7.67 6.67 8.67V22l-1.42-1.42c-2.42-2.42-3.58-5.74-3.25-9.15.3-3.23 2.92-5.91 6.13-6.19 3.2-.28 6.2 1.54 7.6 4.48 1.4 2.94.94 6.32-1.28 8.64L19 22v-1.33c3.83-1 6.67-4.5 6.67-8.67C21 6.03 16.97 2 12 2zm0 18c-3.1 0-5.65-2.22-6.57-5.18-.8-2.58-.2-5.46 1.77-7.43 1.97-1.97 4.85-2.57 7.43-1.77C18.15 12.35 20 15.68 20 19H12zm-2.5-3.5h5v2h-5v-2z"/>
      </svg>
    );
    case "Environment":
    case "Nature": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M17.66 17.66C15.9 19.42 13.45 20 12 20s-3.9-1.58-5.66-3.34C4.58 14.9 4 12.45 4 11c0-1.45.58-3.9 2.34-5.66C8.1 3.58 10.55 3 12 3s3.9 1.58 5.66 3.34C19.42 8.1 20 10.55 20 12c0 1.45-.58 3.9-2.34 5.66zM12 5c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
      </svg>
    );
    case "Walking Tracks": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2c-1.1 0-2 .9-2 2v10c0 1.1-.9 2-2 2H6v-2h2V4c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14h16V4c0-1.1-.9-2-2-2h-2zm-6 16h-2v-2h2v2z"/>
      </svg>
    );
    case "National Parks": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zM7 13l3 3 5-5-1.41-1.41-3.59 3.59-1.59-1.59L7 13z"/>
      </svg>
    );
    case "Weed Spotting": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    );
    case "Wildlife": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S13.66 5 12 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm8 2h-2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
      </svg>
    );
    case "Trees": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>
    );
    case "Water": return (
      <svg style={iconStyle} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17c-3.87 0-7-3.13-7-7 0-2.22 1.03-4.2 2.65-5.59L12 4.38l4.35 4.03C14.97 9.8 14 11.78 14 14c0 3.87-3.13 7-7 7z"/>
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
  const [userCouncilName, setUserCouncilName] = useState(null);
  const [userCouncilLogoUrl, setUserCouncilLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCommunitySubCategory, setSelectedCommunitySubCategory] = useState(null);
  const [selectedRoadSubCategory, setSelectedRoadSubCategory] = useState(null);
  const [selectedPublicHealthSubCategory, setSelectedPublicHealthSubCategory] = useState(null);
  const [selectedEnvironmentSubCategory, setSelectedEnvironmentSubCategory] = useState(null); // New state for environment sub-tiles
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
          // Changed from alert() to a custom console log.
          console.error('Session expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userCouncilName');
          localStorage.removeItem('userCouncilLogoUrl');
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
          // Changed from alert() to a custom console log.
          console.error('Session expired. Please log in again.');
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
    // Reset all sub-category selections when a new main category is clicked
    setSelectedCommunitySubCategory(null);
    setSelectedRoadSubCategory(null);
    setSelectedPublicHealthSubCategory(null);
    setSelectedEnvironmentSubCategory(null);
  };

  const handleCommunitySubTileClick = (subCategory) => {
    setSelectedCommunitySubCategory(subCategory);
  };

  const handleRoadSubTileClick = (subCategory) => {
    setSelectedRoadSubCategory(subCategory);
  };

  const handlePublicHealthSubTileClick = (subCategory) => {
    setSelectedPublicHealthSubCategory(subCategory);
  };

  const handleEnvironmentSubTileClick = (subCategory) => {
    setSelectedEnvironmentSubCategory(subCategory);
  };


  const selectedCategoryItems = selectedCategory ? (processes[selectedCategory] || []) : [];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <h1>Loading Dashboard...</h1>
        <p>Please wait while we fetch your data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
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

  // Helper component to render community sub-tiles
  const renderCommunitySubTiles = () => (
    <div className="sub-tiles-container">
      {communitySubCategories.map(subCategory => (
        <div
          key={subCategory}
          className={`sub-tile ${selectedCommunitySubCategory === subCategory ? 'sub-tile-selected' : ''}`}
          onClick={() => handleCommunitySubTileClick(subCategory)}
        >
          <div className="sub-tile-icon">{getCategoryIcon(subCategory)}</div>
          <span className="sub-tile-text">{subCategory}</span>
        </div>
      ))}
    </div>
  );

  // Helper component to render community sub-category details
  const renderCommunityDetails = () => {
    if (!selectedCommunitySubCategory) {
      return (
        <div className="sub-details-content">
          <p className="no-entries">Please select a community sub-category.</p>
        </div>
      );
    }
    // For now, we'll show a simple message as there's no backend data
    return (
      <div className="sub-details-content">
        <h3 className="sub-details-title">{selectedCommunitySubCategory}</h3>
        <p className="no-entries">No entries found for {selectedCommunitySubCategory}.</p>
      </div>
    );
  };

  // Helper component to render roads sub-tiles and map
  const renderRoadsContent = () => (
    <div className="sub-content-container">
      <div className="sub-tiles-container">
        {roadSubCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`sub-tile ${selectedRoadSubCategory === subCategory ? 'sub-tile-selected' : ''}`}
            onClick={() => handleRoadSubTileClick(subCategory)}
          >
            <div className="sub-tile-icon">{getCategoryIcon(subCategory)}</div>
            <span className="sub-tile-text">{subCategory}</span>
          </div>
        ))}
      </div>
      <div className="sub-details-content">
        <div className="map-placeholder">
          <p>Map showing road information will appear here.</p>
        </div>
        <div className="roads-sub-category-details">
          {selectedRoadSubCategory ? (
            <p className="no-entries">No entries found for {selectedRoadSubCategory}.</p>
          ) : (
            <p className="no-entries">Please select a road sub-category to view details.</p>
          )}
        </div>
      </div>
    </div>
  );

  // Helper component to render public health sub-tiles and details
  const renderPublicHealthContent = () => (
    <div className="sub-content-container">
      <div className="sub-tiles-container">
        {publicHealthSubCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`sub-tile ${selectedPublicHealthSubCategory === subCategory ? 'sub-tile-selected' : ''}`}
            onClick={() => handlePublicHealthSubTileClick(subCategory)}
          >
            <div className="sub-tile-icon">{getCategoryIcon(subCategory)}</div>
            <span className="sub-tile-text">{subCategory}</span>
          </div>
        ))}
      </div>
      <div className="sub-details-content">
        {selectedPublicHealthSubCategory ? (
          <p className="no-entries">No entries found for {selectedPublicHealthSubCategory}.</p>
        ) : (
          <p className="no-entries">Please select a public health sub-category to view details.</p>
        )}
      </div>
    </div>
  );
  
  // Helper component to render environment sub-tiles and details
  const renderEnvironmentContent = () => (
    <div className="sub-content-container">
      <div className="sub-tiles-container">
        {environmentSubCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`sub-tile ${selectedEnvironmentSubCategory === subCategory ? 'sub-tile-selected' : ''}`}
            onClick={() => handleEnvironmentSubTileClick(subCategory)}
          >
            <div className="sub-tile-icon">{getCategoryIcon(subCategory)}</div>
            <span className="sub-tile-text">{subCategory}</span>
          </div>
        ))}
      </div>
      <EnvironmentDetails selectedSubCategory={selectedEnvironmentSubCategory} />
    </div>
  );


  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="header-left">
          {userCouncilLogoUrl ? (
            <img 
              src={userCouncilLogoUrl} 
              alt={`${userCouncilName || 'Council'} Logo`} 
              className="council-logo"
            />
          ) : (
            <div className="council-logo-placeholder"></div>
          )}
          <h1 className="welcome-heading">Welcome, {userName}</h1>
        </div>
        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userCouncilName');
          localStorage.removeItem('userCouncilLogoUrl');
          navigate('/#/');
        }}>Logout</button>
      </header>

      {/* Main Categories Section */}
      <section className="main-categories-section">
        <div className="main-tiles-container">
          {categories.map(category => (
            <div
              key={category}
              className={`main-tile ${selectedCategory === category ? 'main-tile-selected' : ''}`}
              onClick={() => handleTileClick(category)}
            >
              <div className="main-tile-icon-container">{getCategoryIcon(category)}</div>
              <span className="main-tile-text">{category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Content Section */}
      {selectedCategory && (
        <section className="dynamic-content-section">
          <h2 className="section-title">Details for {selectedCategory}</h2>
          
          {/* Conditional rendering for different categories */}
          {selectedCategory === 'Community' ? (
            <div className="sub-content-container">
              {renderCommunitySubTiles()}
              {renderCommunityDetails()}
            </div>
          ) : selectedCategory === 'Roads' ? (
            renderRoadsContent()
          ) : selectedCategory === 'Public Health' ? (
            renderPublicHealthContent()
          ) : selectedCategory === 'Environment' ? (
            renderEnvironmentContent()
          ) : (
            <div className="sub-content-container single-column-details">
              <div className="sub-details-content">
                {selectedCategoryItems.length > 0 || selectedCategory === 'Animals' || selectedCategory === 'Waste' || selectedCategory === 'Development' ? (
                  selectedCategory === 'Rates' ? (
                    <RatesDetails properties={selectedCategoryItems} />
                  ) : selectedCategory === 'Water' ? (
                    <WaterDetails properties={selectedCategoryItems} />
                  ) : selectedCategory === 'Animals' ? (
                    <AnimalDetails animals={selectedCategoryItems} />
                  ) : selectedCategory === 'Waste' ? (
                    <WasteDetails wasteData={selectedCategoryItems} />
                  ) : selectedCategory === 'Development' ? (
                    <DevelopmentDetails applications={selectedCategoryItems} />
                  ) : (
                    <ul>
                      {selectedCategoryItems.map((item) => (
                        <li key={item.id} className="process-item-full-detail">
                          <div>
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
                          </div>
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
        </section>
      )}
    </div>
  );
}

export default DashboardPage;
