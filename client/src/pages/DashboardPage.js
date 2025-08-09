import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Droplet as DropletIcon,
  Building as BuildingIcon,
  Users as UsersIcon,
  Road as RoadIcon,
  Trash as TrashIcon,
  PawPrint as PawPrintIcon,
  HeartPulse as HeartPulseIcon,
  TreePine as TreePineIcon,
  Newspaper as NewspaperIcon,
  ClipboardList as ClipboardListIcon,
  Calendar as CalendarIcon,
  Construction as ConstructionIcon,
  TriangleAlert as TriangleAlertIcon,
  Syringe as SyringeIcon,
  HandPlatter as HandPlatterIcon,
  Bug as BugIcon,
  Tractor as TractorIcon,
  PawPrint as PawPrintSvg,
  Map as MapIcon,
  Heart as HeartIcon,
  TreeDeciduous as TreeDeciduousIcon,
  Water as WaterSvg,
  Mountain as MountainIcon
} from 'lucide-react';

// =============================================================
// ICONS COMPONENT
// This component centralizes all SVG icon rendering logic.
// This keeps the main dashboard component clean and readable.
// =============================================================
const Icons = ({ category }) => {
  const iconStyle = "w-6 h-6";
  switch (category) {
    case "Rates": return <HomeIcon className={iconStyle} />;
    case "Water": return <DropletIcon className={iconStyle} />;
    case "Development": return <BuildingIcon className={iconStyle} />;
    case "Community": return <UsersIcon className={iconStyle} />;
    case "Roads": return <RoadIcon className={iconStyle} />;
    case "Waste": return <TrashIcon className={iconStyle} />;
    case "Animals": return <PawPrintIcon className={iconStyle} />;
    case "Public Health": return <HeartPulseIcon className={iconStyle} />;
    case "Environment": return <TreePineIcon className={iconStyle} />;
    case "Community News": return <NewspaperIcon className={iconStyle} />;
    case "Community Groups": return <UsersIcon className={iconStyle} />;
    case "Community Services": return <HandPlatterIcon className={iconStyle} />;
    case "Local Events": return <CalendarIcon className={iconStyle} />;
    case "Current Road works": return <ConstructionIcon className={iconStyle} />;
    case "Upcoming Roadworks": return <ConstructionIcon className={iconStyle} />;
    case "Report a problem": return <TriangleAlertIcon className={iconStyle} />;
    case "Medical Services": return <SyringeIcon className={iconStyle} />;
    case "Resources": return <HandPlatterIcon className={iconStyle} />;
    case "Mental Health": return <HeartIcon className={iconStyle} />;
    case "Nature": return <TreeDeciduousIcon className={iconStyle} />;
    case "Walking Tracks": return <MapIcon className={iconStyle} />;
    case "National Parks": return <MountainIcon className={iconStyle} />;
    case "Weed Spotting": return <BugIcon className={iconStyle} />;
    case "Wildlife": return <PawPrintSvg className={iconStyle} />;
    case "Trees": return <TreeDeciduousIcon className={iconStyle} />;
    default: return <HomeIcon className={iconStyle} />;
  }
};

// =============================================================
// PLACEHOLDER COMPONENTS
// These components are stubs for the original detailed pages.
// You can replace these with your actual component files.
// =============================================================
const RatesDetails = ({ properties }) => (
  <div className="p-4 bg-gray-100 rounded-lg">
    <h3 className="text-xl font-semibold mb-2">Rates Details</h3>
    <p>This is a placeholder for Rates details.</p>
    {properties && properties.length > 0 && (
      <ul>
        {properties.map((p, index) => <li key={index}>{p.title}</li>)}
      </ul>
    )}
  </div>
);

const WaterDetails = ({ properties }) => (
  <div className="p-4 bg-gray-100 rounded-lg">
    <h3 className="text-xl font-semibold mb-2">Water Details</h3>
    <p>This is a placeholder for Water details.</p>
    {properties && properties.length > 0 && (
      <ul>
        {properties.map((p, index) => <li key={index}>{p.title}</li>)}
      </ul>
    )}
  </div>
);

const AnimalDetails = ({ animals }) => (
  <div className="p-4 bg-gray-100 rounded-lg">
    <h3 className="text-xl font-semibold mb-2">Animal Details</h3>
    <p>This is a placeholder for Animal details.</p>
    {animals && animals.length > 0 && (
      <ul>
        {animals.map((a, index) => <li key={index}>{a.title}</li>)}
      </ul>
    )}
  </div>
);

const WasteDetails = ({ wasteData }) => (
  <div className="p-4 bg-gray-100 rounded-lg">
    <h3 className="text-xl font-semibold mb-2">Waste Details</h3>
    <p>This is a placeholder for Waste details.</p>
    {wasteData && wasteData.length > 0 && (
      <ul>
        {wasteData.map((d, index) => <li key={index}>{d.title}</li>)}
      </ul>
    )}
  </div>
);

const DevelopmentDetails = ({ applications }) => (
  <div className="p-4 bg-gray-100 rounded-lg">
    <h3 className="text-xl font-semibold mb-2">Development Details</h3>
    <p>This is a placeholder for Development details.</p>
    {applications && applications.length > 0 && (
      <ul>
        {applications.map((a, index) => <li key={index}>{a.title}</li>)}
      </ul>
    )}
  </div>
);

// =============================================================
// SUB-CATEGORY COMPONENTS
// These components render the sub-tiles and their details.
// They are a direct refactor of the helper functions from the original file.
// =============================================================
const CommunitySection = ({ selectedSubCategory, setSelectedSubCategory }) => {
  const subCategories = ["Community News", "Community Groups", "Community Services", "Local Events"];
  return (
    <>
      <div className="flex flex-wrap gap-4 mb-4">
        {subCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-md transition-all duration-300 cursor-pointer ${
              selectedSubCategory === subCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'
            }`}
            onClick={() => setSelectedSubCategory(subCategory)}
          >
            <Icons category={subCategory} />
            <span className="mt-2 text-sm text-center font-medium">{subCategory}</span>
          </div>
        ))}
      </div>
      <div className="p-6 bg-gray-100 rounded-xl">
        {selectedSubCategory ? (
          <div className="sub-details-content">
            <h3 className="text-2xl font-bold mb-4">{selectedSubCategory}</h3>
            <p className="text-gray-600">No entries found for {selectedSubCategory}.</p>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">Please select a community sub-category.</p>
        )}
      </div>
    </>
  );
};

const RoadsSection = ({ selectedSubCategory, setSelectedSubCategory }) => {
  const subCategories = ["Current Road works", "Upcoming Roadworks", "Report a problem"];
  return (
    <>
      <div className="flex flex-wrap gap-4 mb-4">
        {subCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-md transition-all duration-300 cursor-pointer ${
              selectedSubCategory === subCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'
            }`}
            onClick={() => setSelectedSubCategory(subCategory)}
          >
            <Icons category={subCategory} />
            <span className="mt-2 text-sm text-center font-medium">{subCategory}</span>
          </div>
        ))}
      </div>
      <div className="p-6 bg-gray-100 rounded-xl">
        <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
          <p className="text-gray-500">Map showing road information will appear here.</p>
        </div>
        {selectedSubCategory ? (
          <div className="sub-details-content">
            <h3 className="text-2xl font-bold mb-4">{selectedSubCategory}</h3>
            <p className="text-gray-600">No entries found for {selectedSubCategory}.</p>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">Please select a road sub-category to view details.</p>
        )}
      </div>
    </>
  );
};

const PublicHealthSection = ({ selectedSubCategory, setSelectedSubCategory }) => {
  const subCategories = ["Medical Services", "Resources", "Mental Health"];
  return (
    <>
      <div className="flex flex-wrap gap-4 mb-4">
        {subCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-md transition-all duration-300 cursor-pointer ${
              selectedSubCategory === subCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'
            }`}
            onClick={() => setSelectedSubCategory(subCategory)}
          >
            <Icons category={subCategory} />
            <span className="mt-2 text-sm text-center font-medium">{subCategory}</span>
          </div>
        ))}
      </div>
      <div className="p-6 bg-gray-100 rounded-xl">
        {selectedSubCategory ? (
          <div className="sub-details-content">
            <h3 className="text-2xl font-bold mb-4">{selectedSubCategory}</h3>
            <p className="text-gray-600">No entries found for {selectedSubCategory}.</p>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">Please select a public health sub-category.</p>
        )}
      </div>
    </>
  );
};

const EnvironmentDetails = ({ selectedSubCategory }) => {
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
    <div className="p-6 bg-gray-100 rounded-xl">
      {selectedSubCategory ? (
        <>
          <h3 className="text-2xl font-bold mb-4">{selectedSubCategory}</h3>
          {selectedData.length > 0 ? (
            <ul className="space-y-4">
              {selectedData.map((item) => (
                <li key={item.id} className="p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-lg font-semibold">{item.title}</div>
                  <div className="text-gray-600">
                    {item.description || `Length: ${item.length}, Difficulty: ${item.difficulty}`}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No entries found for {selectedSubCategory}.</p>
          )}
        </>
      ) : (
        <p className="text-gray-600 text-center py-8">Please select an environment sub-category to view details.</p>
      )}
    </div>
  );
};

const EnvironmentSection = ({ selectedSubCategory, setSelectedSubCategory }) => {
  const subCategories = [
    "Nature", "Walking Tracks", "National Parks", "Weed Spotting", "Wildlife", "Trees", "Water"
  ];
  return (
    <>
      <div className="flex flex-wrap gap-4 mb-4">
        {subCategories.map(subCategory => (
          <div
            key={subCategory}
            className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-md transition-all duration-300 cursor-pointer ${
              selectedSubCategory === subCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'
            }`}
            onClick={() => setSelectedSubCategory(subCategory)}
          >
            <Icons category={subCategory} />
            <span className="mt-2 text-sm text-center font-medium">{subCategory}</span>
          </div>
        ))}
      </div>
      <EnvironmentDetails selectedSubCategory={selectedSubCategory} />
    </>
  );
};

// =============================================================
// MAIN DASHBOARD COMPONENT
// This is the core logic that orchestrates the entire page.
// It's much cleaner now without the icon SVGs or detailed
// sub-category rendering logic.
// =============================================================
function Dashboard() {
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
  const [selectedEnvironmentSubCategory, setSelectedEnvironmentSubCategory] = useState(null);
  const navigate = useNavigate();

  const categories = [
    "Rates", "Water", "Development", "Community",
    "Roads", "Waste", "Animals", "Public Health", "Environment"
  ];

  const fetchUserProfileAndDashboardData = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    try {
      // Mock API calls for demonstration
      const userProfileData = {
        name: 'John Doe',
        council_name: 'Example City Council',
        council_logo_url: 'https://placehold.co/100x40/4F46E5/ffffff?text=LOGO'
      };
      const dashboardResultData = {
        "Rates": [{ id: 1, title: "Property Rates", status: "Paid" }],
        "Water": [{ id: 1, title: "Water Bill", status: "Pending" }],
        "Animals": [{ id: 1, title: "Dog Registration", status: "Active" }],
        "Waste": [{ id: 1, title: "Waste Collection Schedule", status: "Upcoming" }],
        "Development": [{ id: 1, title: "Building Application", status: "Submitted" }],
        "Community": [],
        "Roads": [],
        "Public Health": [],
        "Environment": [],
      };
      
      setUserName(userProfileData.name);
      setUserCouncilName(userProfileData.council_name);
      setUserCouncilLogoUrl(userProfileData.council_logo_url);
      setProcesses(dashboardResultData);

    } catch (err) {
      console.error('DashboardPage: Error during data fetch:', err);
      setError(`Failed to load dashboard data. ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // We'll mock a token for this example
    const token = 'mock_token';
    if (!token) {
      navigate('/#/');
      return;
    }
    fetchUserProfileAndDashboardData(token);
  }, [navigate, fetchUserProfileAndDashboardData]);

  const handleTileClick = (category) => {
    setSelectedCategory(category);
    setSelectedCommunitySubCategory(null);
    setSelectedRoadSubCategory(null);
    setSelectedPublicHealthSubCategory(null);
    setSelectedEnvironmentSubCategory(null);
  };

  const selectedCategoryItems = selectedCategory ? (processes[selectedCategory] || []) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-indigo-600">
        <h1 className="text-3xl font-bold">Loading Dashboard...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <h1 className="text-3xl font-bold">Error Loading Dashboard</h1>
        <p className="mt-4 text-xl">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-8">
      {/* Dashboard Header */}
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-xl mb-8">
        <div className="flex items-center space-x-4">
          {userCouncilLogoUrl ? (
            <img
              src={userCouncilLogoUrl}
              alt={`${userCouncilName || 'Council'} Logo`}
              className="h-10 w-auto rounded-lg"
              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="h-10 w-10 bg-gray-300 rounded-lg"></div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {userName}</h1>
        </div>
        <button
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-md hover:bg-indigo-700 transition-colors"
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/#/');
          }}
        >
          Logout
        </button>
      </header>

      {/* Main Categories Section */}
      <section className="main-categories-section mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Main Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {categories.map(category => (
            <div
              key={category}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 cursor-pointer text-center
                ${selectedCategory === category
                  ? 'bg-indigo-600 text-white shadow-xl scale-105'
                  : 'bg-white hover:bg-indigo-50 hover:shadow-lg'
                }`}
              onClick={() => handleTileClick(category)}
            >
              <div className="mb-2 text-4xl">{<Icons category={category} />}</div>
              <span className="text-lg font-semibold">{category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Content Section */}
      {selectedCategory && (
        <section className="dynamic-content-section p-8 bg-white rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Details for {selectedCategory}</h2>

          {/* This is the refactored, dynamic content area */}
          <div className="sub-content-container">
            {(() => {
              switch (selectedCategory) {
                case 'Rates':
                  return <RatesDetails properties={selectedCategoryItems} />;
                case 'Water':
                  return <WaterDetails properties={selectedCategoryItems} />;
                case 'Development':
                  return <DevelopmentDetails applications={selectedCategoryItems} />;
                case 'Waste':
                  return <WasteDetails wasteData={selectedCategoryItems} />;
                case 'Animals':
                  return <AnimalDetails animals={selectedCategoryItems} />;
                case 'Community':
                  return (
                    <CommunitySection
                      selectedSubCategory={selectedCommunitySubCategory}
                      setSelectedSubCategory={setSelectedCommunitySubCategory}
                    />
                  );
                case 'Roads':
                  return (
                    <RoadsSection
                      selectedSubCategory={selectedRoadSubCategory}
                      setSelectedSubCategory={setSelectedRoadSubCategory}
                    />
                  );
                case 'Public Health':
                  return (
                    <PublicHealthSection
                      selectedSubCategory={selectedPublicHealthSubCategory}
                      setSelectedSubCategory={setSelectedPublicHealthSubCategory}
                    />
                  );
                case 'Environment':
                  return (
                    <EnvironmentSection
                      selectedSubCategory={selectedEnvironmentSubCategory}
                      setSelectedSubCategory={setSelectedEnvironmentSubCategory}
                    />
                  );
                default:
                  return (
                    <div className="p-6 bg-gray-100 rounded-xl">
                      <p className="text-gray-600">No details found for this category.</p>
                    </div>
                  );
              }
            })()}
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================================
// MAIN APP COMPONENT
// This is a minimal wrapper to simulate a full React app setup.
// You would typically have this in your App.js.
// It includes a mock for react-router-dom's useNavigate hook.
// =============================================================
function App() {
  const MockRouter = ({ children }) => {
    const [path, setPath] = useState('/');
    const navigate = (newPath) => {
      console.log(`Navigating to ${newPath}`);
      setPath(newPath);
    };

    const navContext = { navigate };

    return (
      <div className="font-sans antialiased text-gray-800 bg-gray-50">
        <div className="p-4 bg-gray-200">
          <p className="text-sm font-semibold">
            Current Path: {path}
            {path === '/#/' && <span className="ml-2 text-red-500">Redirected!</span>}
          </p>
        </div>
        {children(navContext)}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <MockRouter>{({ navigate }) => <Dashboard navigate={navigate} />}</MockRouter>
    </div>
  );
}

export default App;
