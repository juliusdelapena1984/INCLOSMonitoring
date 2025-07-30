import React, { useState, useEffect, useRef } from 'react';

// Load SheetJS (xlsx) library from CDN for Excel parsing
const loadXLSXScript = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve(); // Already loaded
      return;
    }
    const script = document.createElement('script');
    // Updated to a more recent version of SheetJS from CDN
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Main App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [missions, setMissions] = useState([]);
  const [allChurchMembers, setAllChurchMembers] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [evangelicalWorkers, setEvangelicalWorkers] = useState([]);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('monitoring'); // 'monitoring', 'administration', 'analytics'
  const [isDarkMode, setIsDarkMode] = useState(true); // State for dark mode

  // State for week navigation: 0 for current week, -1 for previous, 1 for next, etc.
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [displayedMissions, setDisplayedMissions] = useState([]); // State for filtered missions
  const [currentWeekDisplay, setCurrentWeekDisplay] = useState(''); // To display "Week X (Start Date - End Date)"

  // State for MissionModal, controlled by App
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingMission, setEditingMission] = useState(null);

  // State for MemberGuestsModal, lifted to App component for global control
  const [showMemberGuestsModal, setShowMemberGuestsModal] = useState(false);
  const [currentMemberForGuests, setCurrentMemberForGuests] = useState(null);
  const [currentMemberGuestsInput, setCurrentMemberGuestsInput] = useState('');

  const API_BASE_URL = 'http://localhost:5000';

  // Helper to get formatted date string (YYYY-MM-DD)
  const getFormattedDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get the date range for a given week offset (Monday to Sunday)
  const getWeekDateRange = (offset) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfCurrentWeek = new Date(today.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)));

    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfTargetWeek.getDate() + (offset * 7));

    const endOfTargetWeek = new Date(startOfTargetWeek);
    endOfTargetWeek.setDate(endOfTargetWeek.getDate() + 6);

    const formattedStartDate = getFormattedDate(startOfTargetWeek);
    const formattedEndDate = getFormattedDate(endOfTargetWeek);

    const yearStart = new Date(startOfTargetWeek.getFullYear(), 0, 1);
    const daysSinceYearStart = (startOfTargetWeek.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
    const weekNum = Math.ceil(daysSinceYearStart / 7) + 1;

    const displayString = `Week ${weekNum} (${formattedStartDate} to ${formattedEndDate})`;

    return {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      display: displayString
    };
  };

  // Simulate Google Login
  const handleGoogleLogin = () => {
    setMessage('Simulating Google login...');
    setTimeout(() => {
      setIsLoggedIn(true);
      setMessage('Login successful!');
      fetchData();
    }, 1500);
  };

  // Handle Sign Out
  const handleSignOut = () => {
    setIsLoggedIn(false);
    setMissions([]);
    setAllChurchMembers([]);
    setAllVenues([]);
    setEvangelicalWorkers([]);
    setMessage('Signed out successfully.');
    setCurrentPage('monitoring'); // Reset to monitoring page on sign out
  };

  const fetchData = async () => {
    try {
      const missionsResponse = await fetch(`${API_BASE_URL}/api/missions`);
      if (!missionsResponse.ok) throw new Error(`HTTP error fetching missions! status: ${missionsResponse.status}`);
      const missionsData = await missionsResponse.json();
      setMissions(missionsData); // Missions are now already sorted by backend

      const refDataResponse = await fetch(`${API_BASE_URL}/api/referencedata`);
      if (!refDataResponse.ok) throw new Error(`HTTP error fetching reference data! status: ${refDataResponse.status}`);
      const refData = await refDataResponse.json();

      setAllChurchMembers(refData.members);
      setAllVenues(refData.venues);
      setEvangelicalWorkers(refData.evangelicalWorkers);

    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Failed to load data. Please try again.');
    }
  };

  // Effect to filter missions based on currentWeekOffset
  useEffect(() => {
    const { startDate, endDate, display } = getWeekDateRange(currentWeekOffset);
    setCurrentWeekDisplay(display);

    const filtered = missions.filter(mission => {
      return mission.date >= startDate && mission.date <= endDate;
    });
    setDisplayedMissions(filtered);
  }, [missions, currentWeekOffset]);


  // --- MemberGuestsModal handlers (lifted to App component) ---
  const handleOpenMemberGuestsModal = (member, initialGuests) => {
    setCurrentMemberForGuests(member);
    setCurrentMemberGuestsInput(initialGuests);
    setShowMemberGuestsModal(true);
  };

  const handleSaveMemberGuests = (memberId, guestsString) => {
    if (editingMission) {
      const updatedAttendedMembers = editingMission.attendedMembers.map(m =>
        m.memberId === memberId ? { ...m, memberGuests: guestsString } : m
      );
      setEditingMission(prev => ({
        ...prev,
        attendedMembers: updatedAttendedMembers
      }));
    }
    setShowMemberGuestsModal(false);
    setCurrentMemberForGuests(null);
    setCurrentMemberGuestsInput('');
  };

  const handleCloseMemberGuestsModal = () => {
    setShowMemberGuestsModal(false);
    setCurrentMemberForGuests(null);
    setCurrentMemberGuestsInput('');
  };

  // --- CRUD operations for Admin Page ---
  const handleAddEntity = async (entityType, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP error adding ${entityType}! status: ${response.status}`);
      setMessage(`${entityType} added successfully!`);
      fetchData(); // Re-fetch all data to update state
    } catch (error) {
      console.error(`Error adding ${entityType}:`, error);
      setMessage(`Failed to add ${entityType}.`);
    }
  };

  const handleUpdateEntity = async (entityType, id, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${entityType}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP error updating ${entityType}! status: ${response.status}`);
      setMessage(`${entityType} updated successfully!`);
      fetchData();
    } catch (error) {
      console.error(`Error updating ${entityType}:`, error);
      setMessage(`Failed to update ${entityType}.`);
    }
  };

  const handleDeleteEntity = async (entityType, id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${entityType}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error deleting ${entityType}! status: ${response.status}`);
      setMessage(`${entityType} deleted successfully!`);
      fetchData();
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      setMessage(`Failed to delete ${entityType}.`);
    }
  };

  // New: Handle bulk add/update for CSV/Excel import
  const handleBulkAddOrUpdateEntity = async (entityType, dataArray) => {
    setMessage(`Processing bulk upload for ${entityType}...`);
    let successCount = 0;
    let failCount = 0;

    for (const item of dataArray) {
      try {
        if (item.id) {
          // Attempt to update if ID exists
          const response = await fetch(`${API_BASE_URL}/api/${entityType}/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!response.ok) throw new Error(`Failed to update ${item.id}`);
        } else {
          // Add as new if no ID
          const response = await fetch(`${API_BASE_URL}/api/${entityType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!response.ok) throw new Error(`Failed to add new item`);
        }
        successCount++;
      } catch (error) {
        console.error(`Error processing item for ${entityType}:`, item, error);
        failCount++;
      }
    }
    setMessage(`Bulk upload for ${entityType} completed: ${successCount} successful, ${failCount} failed.`);
    fetchData(); // Re-fetch all data after bulk operation
  };


  // Effect to clear messages after a delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Effect to apply dark mode class to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 font-sans transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-sm w-full transition-colors duration-300">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Welcome</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Please log in to access the Bible Mission Monitoring system.</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            Simulate Google Login
          </button>
          {message && <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 font-sans flex flex-col items-center transition-colors duration-300">
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <div className="text-gray-600 dark:text-gray-400 text-sm">Locale of Elizabeth, District of New Jersey</div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.459 4.577a1 1 0 01-1.39.027l-2.007-1.606a1 1 0 01.126-1.562l2.45-1.633a1 1 0 111.171 1.748l-1.306.871.794.635a1 1 0 01.026 1.39zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zM17 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM6.293 4.293a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414L6.293 5.707a1 1 0 010-1.414zM14.707 15.707a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 011.414-1.414l1.414 1.414a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setCurrentPage('monitoring')}
            className={`py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
              currentPage === 'monitoring' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => setCurrentPage('administration')}
            className={`py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
              currentPage === 'administration' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Administration
          </button>
          <button
            onClick={() => setCurrentPage('analytics')}
            className={`py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
              currentPage === 'analytics' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            Sign Out
          </button>
        </div>
      </header>
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-10 text-center">
        Light Of Salvation Bible Mission Monitoring
      </h1>
      {message && (
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-200 px-4 py-3 rounded-lg relative mb-6 w-full max-w-6xl text-center" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      {currentPage === 'monitoring' && (
        <MonitoringPage
          missions={missions}
          displayedMissions={displayedMissions}
          currentWeekOffset={currentWeekOffset}
          currentWeekDisplay={currentWeekDisplay}
          setCurrentWeekOffset={setCurrentWeekOffset}
          showMissionModal={showMissionModal}
          editingMission={editingMission}
          setShowMissionModal={setShowMissionModal}
          setEditingMission={setEditingMission}
          handleOpenAddModal={() => {
            setEditingMission(null);
            setShowMissionModal(true);
          }}
          handleOpenEditModal={(mission) => {
            setEditingMission(mission);
            setShowMissionModal(true);
          }}
          allChurchMembers={allChurchMembers}
          allVenues={allVenues}
          evangelicalWorkers={evangelicalWorkers}
          handleSaveMissionSubmit={async (missionData) => {
            try {
              let response;
              if (editingMission) {
                response = await fetch(`${API_BASE_URL}/api/missions/${editingMission.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(missionData),
                });
              } else {
                response = await fetch(`${API_BASE_URL}/api/missions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(missionData),
                });
              }

              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

              setMessage(editingMission ? 'Mission updated successfully!' : 'Mission added successfully!');
              setShowMissionModal(false);
              setEditingMission(null);
              fetchData();
            } catch (error) {
              console.error('Error saving mission:', error);
              setMessage('Failed to save mission. Please try again.');
            }
          }}
          onOpenMemberGuestsModal={handleOpenMemberGuestsModal}
        />
      )}

      {currentPage === 'administration' && (
        <AdminPage
          members={allChurchMembers}
          venues={allVenues}
          evangelicalWorkers={evangelicalWorkers}
          onAddEntity={handleAddEntity}
          onUpdateEntity={handleUpdateEntity}
          onDeleteEntity={handleDeleteEntity}
          onBulkAddOrUpdateEntity={handleBulkAddOrUpdateEntity}
        />
      )}

      {currentPage === 'analytics' && (
        <AnalyticsPage
          missions={missions}
          members={allChurchMembers}
        />
      )}

      {/* Render MemberGuestsModal directly in App component, outside of other pages */}
      {showMemberGuestsModal && currentMemberForGuests && (
        <MemberGuestsModal
          member={currentMemberForGuests}
          initialGuests={currentMemberGuestsInput}
          onSave={handleSaveMemberGuests}
          onClose={handleCloseMemberGuestsModal}
        />
      )}
    </div>
  );
}

// New MonitoringPage Component (encapsulates previous App home content)
const MonitoringPage = ({
  missions, displayedMissions, currentWeekDisplay, setCurrentWeekOffset,
  handleOpenAddModal, handleOpenEditModal,
  allChurchMembers, allVenues, evangelicalWorkers, handleSaveMissionSubmit,
  onOpenMemberGuestsModal,
  showMissionModal, editingMission, setShowMissionModal, setEditingMission
}) => {
  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  return (
    <>
      {/* Week Navigation and Display */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md transition-colors duration-300">
        <button
          onClick={handlePrevWeek}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          &larr; Previous Week
        </button>
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {currentWeekDisplay}
        </span>
        <button
          onClick={handleNextWeek}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Next Week &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-6xl">
        {displayedMissions.length > 0 ? (
          displayedMissions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} onEditClick={handleOpenEditModal} />
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-600 dark:text-gray-400">
            No missions found for this week.
          </div>
        )}
        <AddMissionCard onClick={handleOpenAddModal} />
      </div>
      {showMissionModal && (
        <MissionModal
          initialMissionData={editingMission}
          allChurchMembers={allChurchMembers}
          allVenues={allVenues}
          evangelicalWorkers={evangelicalWorkers}
          onSave={handleSaveMissionSubmit}
          onClose={() => {
            setShowMissionModal(false);
            setEditingMission(null);
          }}
          onOpenMemberGuestsModal={onOpenMemberGuestsModal}
        />
      )}
    </>
  );
};

const MissionCard = ({ mission, onEditClick }) => {
  const attendedCount = mission.attendedMembers ? mission.attendedMembers.length : 0;

  return (
    <div
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300"
      onClick={() => onEditClick(mission)}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          {mission.date} {mission.time}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-base mb-4">{mission.location}</p>
        <div className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
          <p>Attended: <span className="font-medium">{attendedCount}</span></p>
          <p>Guests: <span className="font-medium">{mission.guests || 'None'}</span></p>
        </div>
      </div>
      <div className="mt-6 flex items-center">
        <img
          src={mission.workerImage || 'https://placehold.co/40x40/FF0000/FFFFFF?text=JD'}
          alt={mission.workerName}
          className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-red-500"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/CCCCCC/000000?text=NA'; }}
        />
        <div>
          <p className="text-gray-800 dark:text-white font-medium">{mission.workerName}</p>
        </div>
      </div>
    </div>
  );
};

const MissionModal = ({ initialMissionData, allChurchMembers, allVenues, evangelicalWorkers, onSave, onClose, onOpenMemberGuestsModal }) => {
  const getFormattedDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFormattedTime = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();

    if (minutes < 15) {
      minutes = 0;
    } else if (minutes >= 15 && minutes < 45) {
      minutes = 30;
    } else {
      minutes = 0;
      hours = (hours + 1) % 24;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const [missionFormState, setMissionFormState] = useState(() => {
    if (initialMissionData) {
      return {
        ...initialMissionData,
        nonMemberGuests: initialMissionData.nonMemberGuests || '',
        attendedMembers: initialMissionData.attendedMembers || []
      };
    } else {
      const now = new Date();
      return {
        date: getFormattedDate(now),
        time: getFormattedTime(now),
        location: '',
        nonMemberGuests: '',
        workerName: '',
        workerImage: 'https://placehold.co/40x40/CCCCCC/000000?text=NA',
        attendedMembers: []
      };
    }
  });

  useEffect(() => {
    if (initialMissionData) {
      setMissionFormState({
        ...initialMissionData,
        nonMemberGuests: initialMissionData.nonMemberGuests || '',
        attendedMembers: initialMissionData.attendedMembers || []
      });
    } else {
      const now = new Date();
      setMissionFormState(prev => ({
        ...prev,
        date: getFormattedDate(now),
        time: getFormattedTime(now),
        location: '',
        nonMemberGuests: '',
        workerName: '',
        workerImage: 'https://placehold.co/40x40/CCCCCC/000000?text=NA',
        attendedMembers: []
      }));
    }
  }, [initialMissionData]);


  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setMissionFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkerNameChange = (e) => {
    const workerName = e.target.value;
    const selectedWorker = evangelicalWorkers.find(w => w.name === workerName);

    setMissionFormState(prev => ({
      ...prev,
      workerName: workerName,
      workerImage: selectedWorker ? selectedWorker.image : 'https://placehold.co/40x40/CCCCCC/000000?text=NA'
    }));
  };

  const handleAttendedMembersChange = (updatedAttendedMembers) => {
    setMissionFormState(prev => ({ ...prev, attendedMembers: updatedAttendedMembers }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(missionFormState);
  };

  const title = initialMissionData ? 'Edit Bible Mission' : 'Add New Bible Mission';

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={missionFormState.date}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
              <input
                type="time"
                id="time"
                name="time"
                value={missionFormState.time}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <select
                id="location"
                name="location"
                value={missionFormState.location}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a venue</option>
                {allVenues.map(venue => (
                  <option key={venue.id} value={venue.name}>{venue.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nonMemberGuests" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Other Guests (CSV format)</label>
              <input
                type="text"
                id="nonMemberGuests"
                name="nonMemberGuests"
                value={missionFormState.nonMemberGuests}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., John, Mary, 2 others"
              />
            </div>
            <div>
              <label htmlFor="workerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Worker Name</label>
              <input
                type="text"
                id="workerName"
                name="workerName"
                value={missionFormState.workerName}
                onChange={handleWorkerNameChange}
                list="worker-names-datalist"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Jeffrey Dote"
                required
              />
              <datalist id="worker-names-datalist">
                {evangelicalWorkers.map(worker => (
                  <option key={worker.id} value={worker.name} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="workerImagePreview" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Worker Image Preview</label>
              <img
                id="workerImagePreview"
                src={missionFormState.workerImage || 'https://placehold.co/40x40/CCCCCC/000000?text=NA'}
                alt="Worker Preview"
                className="w-10 h-10 rounded-full mt-1 object-cover border-2 border-gray-300 dark:border-gray-600"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/CCCCCC/000000?text=NA'; }}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Attended Members & Their Guests</h3>
            <MembersSelectionTable
              allChurchMembers={allChurchMembers}
              selectedMembers={missionFormState.attendedMembers}
              onSelectionChange={handleAttendedMembersChange}
              onOpenMemberGuestsModal={onOpenMemberGuestsModal}
            />
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              {initialMissionData ? 'Update Mission' : 'Add Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MembersSelectionTable = ({ allChurchMembers, selectedMembers, onSelectionChange, onOpenMemberGuestsModal }) => {
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const getMemberGuests = (memberId) => {
    const memberEntry = selectedMembers.find(m => m.memberId === memberId);
    return memberEntry ? memberEntry.memberGuests : '';
  };

  const handleCheckboxChange = (memberId) => {
    const isCurrentlySelected = selectedMembers.some(m => m.memberId === memberId);
    let newSelectedMembers;

    if (isCurrentlySelected) {
      newSelectedMembers = selectedMembers.filter(m => m.memberId !== memberId);
    } else {
      const member = allChurchMembers.find(m => m.id === memberId);
      newSelectedMembers = [...selectedMembers, { memberId: member.id, memberGuests: '' }];
    }
    onSelectionChange(newSelectedMembers);
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };

  const filteredAndTabbedMembers = allChurchMembers.filter(member => {
    const lowerCaseFilterText = filterText.toLowerCase();
    const matchesFilterText = member.fullName.toLowerCase().includes(lowerCaseFilterText) ||
                              member.areaGroup.toLowerCase().includes(lowerCaseFilterText) ||
                              member.cfo.toLowerCase().includes(lowerCaseFilterText) ||
                              member.offices.toLowerCase().includes(lowerCaseFilterText);
    const isAttended = selectedMembers.some(m => m.memberId === member.id);

    if (!matchesFilterText) {
      return false;
    }

    if (activeTab === 'ALL') {
      return true;
    } else if (activeTab === 'ATTENDED') {
      return isAttended;
    } else if (activeTab === 'ABSENT') {
      return !isAttended;
    }
    return true;
  });

  return (
    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[56px] z-20 flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name, Area Group, CFO, or Offices..."
          value={filterText}
          onChange={handleFilterChange}
          className="w-full sm:w-auto flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex-shrink-0 flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ATTENDED')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'ATTENDED' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            ATTENDED
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ABSENT')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'ABSENT' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            ABSENT
          </button>
        </div>
      </div>
      {filteredAndTabbedMembers.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-[56px] z-10">
            <tr>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Attended
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Area Group
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                CFO
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Offices
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Guests
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndTabbedMembers.map((member) => {
              const isAttended = selectedMembers.some(m => m.memberId === member.id);
              const memberGuests = getMemberGuests(member.id);
              return (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-2 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700"
                      checked={isAttended}
                      onChange={() => handleCheckboxChange(member.id)}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {member.fullName}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {member.areaGroup}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {member.cfo}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {member.offices}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200 flex items-center">
                    <span className="truncate max-w-[100px] mr-2">{memberGuests || 'N/A'}</span>
                    {isAttended && (
                      <button
                        type="button"
                        onClick={() => onOpenMemberGuestsModal(member, memberGuests)}
                        className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-600 dark:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Add/Edit Guests for this member"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No church members found matching your filter.</p>
      )}
    </div>
  );
};

const MemberGuestsModal = ({ member, initialGuests, onSave, onClose }) => {
  const [guestsInput, setGuestsInput] = useState(initialGuests);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(member.id, guestsInput);
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full transition-colors duration-300">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Guests for {member.fullName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="memberGuests" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Guest Names (CSV format)</label>
            <textarea
              id="memberGuests"
              name="memberGuests"
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              rows="4"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Jane's Mom, John's Kids"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              Save Guests
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddMissionCard = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 ease-in-out"
      style={{ minHeight: '200px' }}
    >
      <div className="text-center">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 mx-auto text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Add New Bible Mission</p>
      </div>
    </div>
  );
};

// --- New AdminPage Component ---
const AdminPage = ({ members, venues, evangelicalWorkers, onAddEntity, onUpdateEntity, onDeleteEntity, onBulkAddOrUpdateEntity }) => {
  const [activeAdminTab, setActiveAdminTab] = useState('members'); // 'members', 'venues', 'workers'

  return (
    <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">Administration</h2>

      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setActiveAdminTab('members')}
          className={`py-2 px-4 rounded-lg shadow-sm transition duration-300 ease-in-out ${
            activeAdminTab === 'members' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveAdminTab('venues')}
          className={`py-2 px-4 rounded-lg shadow-sm transition duration-300 ease-in-out ${
            activeAdminTab === 'venues' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Venues
        </button>
        <button
          onClick={() => setActiveAdminTab('workers')}
          className={`py-2 px-4 rounded-lg shadow-sm transition duration-300 ease-in-out ${
            activeAdminTab === 'workers' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Evangelical Workers
        </button>
      </div>

      {activeAdminTab === 'members' && (
        <MembersAdmin
          members={members}
          onAdd={onAddEntity}
          onUpdate={onUpdateEntity}
          onDelete={onDeleteEntity}
          onBulkAddOrUpdate={onBulkAddOrUpdateEntity} // Pass bulk handler
        />
      )}
      {activeAdminTab === 'venues' && (
        <VenuesAdmin
          venues={venues}
          onAdd={onAddEntity}
          onUpdate={onUpdateEntity}
          onDelete={onDeleteEntity}
          onBulkAddOrUpdate={onBulkAddOrUpdateEntity} // Pass bulk handler
        />
      )}
      {activeAdminTab === 'workers' && (
        <WorkersAdmin
          workers={evangelicalWorkers}
          onAdd={onAddEntity}
          onUpdate={onUpdateEntity}
          onDelete={onDeleteEntity}
          onBulkAddOrUpdate={onBulkAddOrUpdateEntity} // Pass bulk handler
        />
      )}
    </div>
  );
};

// --- Admin Sub-Components ---

const MembersAdmin = ({ members, onAdd, onUpdate, onDelete, onBulkAddOrUpdate }) => {
  const [newMember, setNewMember] = useState({ fullName: '', areaGroup: '', cfo: '', offices: '' });
  const [editingMember, setEditingMember] = useState(null);
  const fileInputRef = useRef(null); // Ref for the hidden file input

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewMember(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingMember(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    onAdd('members', newMember);
    setNewMember({ fullName: '', areaGroup: '', cfo: '', offices: '' }); // Clear form
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    onUpdate('members', editingMember.id, editingMember);
    setEditingMember(null); // Exit edit mode
  };

  const handleImportClick = () => {
    fileInputRef.current.click(); // Programmatically click the hidden file input
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvText = event.target.result;
          try {
            const parsedData = parseCsvData(csvText);
            onBulkAddOrUpdate('members', parsedData);
          } catch (error) {
            console.error("Error parsing CSV:", error);
            alert("Failed to parse CSV. Please check the format.");
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          await loadXLSXScript(); // Ensure XLSX library is loaded
          const reader = new FileReader();
          reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0]; // Get the first sheet
            const worksheet = workbook.Sheets[sheetName];
            const parsedData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get data as array of arrays

            // Assuming the first row is headers and subsequent rows are data
            if (parsedData.length > 0) {
              const headers = parsedData[0];
              const rows = parsedData.slice(1);
              const formattedData = rows.map(row => {
                const item = {};
                headers.forEach((header, index) => {
                  const key = header.trim(); // Use header as key directly
                  // Map Excel headers to expected member object keys
                  if (key === 'id') item.id = String(row[index]); // Ensure ID is string
                  else if (key === 'fullName') item.fullName = String(row[index] || '');
                  else if (key === 'areaGroup') item.areaGroup = String(row[index] || '');
                  else if (key === 'cfo') item.cfo = String(row[index] || '');
                  else if (key === 'offices') item.offices = String(row[index] || '');
                });
                return item;
              });
              onBulkAddOrUpdate('members', formattedData);
            } else {
              alert("Excel file is empty or has no data rows.");
            }
          };
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Error loading XLSX library or parsing Excel:", error);
          alert("Failed to load Excel parser or parse file. Please try again.");
        }
      } else {
        alert("Unsupported file type. Please upload a .csv or .xlsx file.");
      }
      e.target.value = null; // Clear the file input
    }
  };

  // Simple CSV parser (assumes header row and comma-separated)
  const parseCsvData = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row: ${lines[i]}`);
        continue;
      }
      const item = {};
      headers.forEach((header, index) => {
        // Map CSV headers to expected member object keys
        if (header === 'id') item.id = values[index];
        else if (header === 'fullName') item.fullName = values[index];
        else if (header === 'areaGroup') item.areaGroup = values[index];
        else if (header === 'cfo') item.cfo = values[index];
        else if (header === 'offices') item.offices = values[index];
        // Add more mappings if CSV headers differ from object keys
      });
      data.push(item);
    }
    return data;
  };


  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Manage Members</h3>

      {/* Add Member Form */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm transition-colors duration-300">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Add New Member</h4>
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="fullName" value={newMember.fullName} onChange={handleAddChange} placeholder="Full Name" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <input type="text" name="areaGroup" value={newMember.areaGroup} onChange={handleAddChange} placeholder="Area Group" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <input type="text" name="cfo" value={newMember.cfo} onChange={handleAddChange} placeholder="CFO" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <input type="text" name="offices" value={newMember.offices} onChange={handleAddChange} placeholder="Offices" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Add Member</button>
        </form>
        <div className="mt-4 text-center">
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" // Accept CSV and Excel
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }} // Hide the input
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Import Members (CSV/Excel)
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm max-h-80 overflow-y-auto transition-colors duration-300">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Existing Members</h4>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Area Group</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CFO</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Offices</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {members.map(member => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{member.fullName}</td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{member.areaGroup}</td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{member.cfo}</td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{member.offices}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <button onClick={() => setEditingMember(member)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2">Edit</button>
                  <button onClick={() => onDelete('members', member.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Member Modal/Form */}
      {editingMember && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-300">
            <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Edit Member</h4>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <input type="text" name="fullName" value={editingMember.fullName} onChange={handleEditChange} placeholder="Full Name" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <input type="text" name="areaGroup" value={editingMember.areaGroup} onChange={handleEditChange} placeholder="Area Group" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <input type="text" name="cfo" value={editingMember.cfo} onChange={handleEditChange} placeholder="CFO" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <input type="text" name="offices" value={editingMember.offices} onChange={handleEditChange} placeholder="Offices" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingMember(null)} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Update Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const VenuesAdmin = ({ venues, onAdd, onUpdate, onDelete, onBulkAddOrUpdate }) => {
  const [newVenue, setNewVenue] = useState({ name: '', address: '' });
  const [editingVenue, setEditingVenue] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewVenue(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingVenue(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    onAdd('venues', newVenue);
    setNewVenue({ name: '', address: '' });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    onUpdate('venues', editingVenue.id, editingVenue);
    setEditingVenue(null);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvText = event.target.result;
          try {
            const parsedData = parseCsvDataVenues(csvText); // Specific parser for venues
            onBulkAddOrUpdate('venues', parsedData);
          } catch (error) {
            console.error("Error parsing CSV:", error);
            alert("Failed to parse CSV. Please check the format.");
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          await loadXLSXScript(); // Ensure XLSX library is loaded
          const reader = new FileReader();
          reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0]; // Get the first sheet
            const worksheet = workbook.Sheets[sheetName];
            const parsedData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (parsedData.length > 0) {
              const headers = parsedData[0];
              const rows = parsedData.slice(1);
              const formattedData = rows.map(row => {
                const item = {};
                headers.forEach((header, index) => {
                  const key = header.trim();
                  if (key === 'id') item.id = String(row[index]);
                  else if (key === 'name') item.name = String(row[index] || '');
                  else if (key === 'address') item.address = String(row[index] || '');
                });
                return item;
              });
              onBulkAddOrUpdate('venues', formattedData);
            } else {
              alert("Excel file is empty or has no data rows.");
            }
          };
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Error loading XLSX library or parsing Excel:", error);
          alert("Failed to load Excel parser or parse file. Please try again.");
        }
      } else {
        alert("Unsupported file type. Please upload a .csv or .xlsx file.");
      }
      e.target.value = null;
    }
  };

  const parseCsvDataVenues = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row: ${lines[i]}`);
        continue;
      }
      const item = {};
      headers.forEach((header, index) => {
        if (header === 'id') item.id = values[index];
        else if (header === 'name') item.name = values[index];
        else if (header === 'address') item.address = values[index];
      });
      data.push(item);
    }
    return data;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Manage Venues</h3>

      {/* Add Venue Form */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm transition-colors duration-300">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Add New Venue</h4>
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" value={newVenue.name} onChange={handleAddChange} placeholder="Venue Name" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <input type="text" name="address" value={newVenue.address} onChange={handleAddChange} placeholder="Address" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Add Venue</button>
        </form>
        <div className="mt-4 text-center">
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Import Venues (CSV/Excel)
          </button>
        </div>
      </div>

      {/* Venues List */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm max-h-80 overflow-y-auto transition-colors duration-300">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Existing Venues</h4>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Address</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {venues.map(venue => (
              <tr key={venue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{venue.name}</td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{venue.address}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <button onClick={() => setEditingVenue(venue)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2">Edit</button>
                  <button onClick={() => onDelete('venues', venue.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Venue Modal/Form */}
      {editingVenue && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-300">
            <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Edit Venue</h4>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <input type="text" name="name" value={editingVenue.name} onChange={handleEditChange} placeholder="Venue Name" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <input type="text" name="address" value={editingVenue.address} onChange={handleEditChange} placeholder="Address" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingVenue(null)} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Update Venue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const WorkersAdmin = ({ workers, onAdd, onUpdate, onDelete, onBulkAddOrUpdate }) => {
  const [newWorker, setNewWorker] = useState({ name: '', image: '' });
  const [editingWorker, setEditingWorker] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewWorker(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingWorker(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    onAdd('evangelicalWorkers', { ...newWorker, image: newWorker.image || 'https://placehold.co/40x40/CCCCCC/000000?text=NA' });
    setNewWorker({ name: '', image: '' });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    onUpdate('evangelicalWorkers', editingWorker.id, { ...editingWorker, image: editingWorker.image || 'https://placehold.co/40x40/CCCCCC/000000?text=NA' });
    setEditingWorker(null);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvText = event.target.result;
          try {
            const parsedData = parseCsvDataWorkers(csvText); // Specific parser for workers
            onBulkAddOrUpdate('evangelicalWorkers', parsedData);
          } catch (error) {
            console.error("Error parsing CSV:", error);
            alert("Failed to parse CSV. Please check the format.");
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          await loadXLSXScript(); // Ensure XLSX library is loaded
          const reader = new FileReader();
          reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0]; // Get the first sheet
            const worksheet = workbook.Sheets[sheetName];
            const parsedData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (parsedData.length > 0) {
              const headers = parsedData[0];
              const rows = parsedData.slice(1);
              const formattedData = rows.map(row => {
                const item = {};
                headers.forEach((header, index) => {
                  const key = header.trim();
                  if (key === 'id') item.id = String(row[index]);
                  else if (key === 'name') item.name = String(row[index] || '');
                  else if (key === 'image') item.image = String(row[index] || '');
                });
                return item;
              });
              onBulkAddOrUpdate('evangelicalWorkers', formattedData);
            } else {
              alert("Excel file is empty or has no data rows.");
            }
          };
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Error loading XLSX library or parsing Excel:", error);
          alert("Failed to load Excel parser or parse file. Please try again.");
        }
      } else {
        alert("Unsupported file type. Please upload a .csv or .xlsx file.");
      }
      e.target.value = null;
    }
  };

  const parseCsvDataWorkers = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row: ${lines[i]}`);
        continue;
      }
      const item = {};
      headers.forEach((header, index) => {
        if (header === 'id') item.id = values[index];
        else if (header === 'name') item.name = values[index];
        else if (header === 'image') item.image = values[index];
      });
      data.push(item);
    }
    return data;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Manage Evangelical Workers</h3>

      {/* Add Worker Form */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm transition-colors duration-300">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Add New Worker</h4>
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" value={newWorker.name} onChange={handleAddChange} placeholder="Worker Name" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
          <input type="text" name="image" value={newWorker.image} onChange={handleAddChange} placeholder="Image URL (optional)" className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Add Worker</button>
        </form>
        <div className="mt-4 text-center">
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Import Workers (CSV/Excel)
          </button>
        </div>
      </div>

      {/* Workers List */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm max-h-80 overflow-y-auto transition-colors duration-300">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Existing Workers</h4>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Image</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {workers.map(worker => (
              <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 whitespace-nowrap">
                  <img src={worker.image || 'https://placehold.co/40x40/CCCCCC/000000?text=NA'} alt={worker.name} className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/CCCCCC/000000?text=NA'; }} />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{worker.name}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <button onClick={() => setEditingWorker(worker)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2">Edit</button>
                  <button onClick={() => onDelete('evangelicalWorkers', worker.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Worker Modal/Form */}
      {editingWorker && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-300">
            <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Edit Worker</h4>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <input type="text" name="name" value={editingWorker.name} onChange={handleEditChange} placeholder="Worker Name" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              <input type="text" name="image" value={editingWorker.image} onChange={handleEditChange} placeholder="Image URL (optional)" className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingWorker(null)} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Update Worker</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


// --- New AnalyticsPage Component ---
const AnalyticsPage = ({ missions, members }) => {
  const processAttendanceData = (missions, members) => {
    const weekly = {};
    const monthly = {};

    missions.forEach(mission => {
      const missionDate = new Date(mission.date);
      // Calculate week number (Monday-Sunday logic)
      const dayOfWeek = missionDate.getDay();
      const startOfWeek = new Date(missionDate);
      startOfWeek.setDate(missionDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      const yearStart = new Date(startOfWeek.getFullYear(), 0, 1);
      const daysSinceYearStart = (startOfWeek.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
      const weekNum = Math.ceil(daysSinceYearStart / 7) + 1;
      const weekKey = `Week ${weekNum}`;

      const monthKey = missionDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      // Initialize if not exists
      if (!weekly[weekKey]) weekly[weekKey] = { areaGroup: 0, cfo: 0, offices: 0 };
      if (!monthly[monthKey]) monthly[monthKey] = { areaGroup: 0, cfo: 0, offices: 0 };

      mission.attendedMembers.forEach(attended => {
        const member = members.find(m => m.id === attended.memberId);
        if (member) {
          if (member.areaGroup) weekly[weekKey].areaGroup += 1;
          if (member.cfo) weekly[weekKey].cfo += 1;
          if (member.offices) weekly[weekKey].offices += 1;

          if (member.areaGroup) monthly[monthKey].areaGroup += 1;
          if (member.cfo) monthly[monthKey].cfo += 1;
          if (member.offices) monthly[monthKey].offices += 1;
        }
      });
    });

    return {
      weekly: Object.keys(weekly).map(key => ({ week: key, ...weekly[key] })),
      monthly: Object.keys(monthly).map(key => ({ month: key, ...monthly[key] }))
    };
  };

  const { weekly, monthly } = processAttendanceData(missions, members);

  return (
    <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">Analytics</h2>

      <div className="space-y-8">
        {/* Weekly Attendance */}
        <div>
          <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Weekly Attendance by Group</h3>
          {weekly.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Week</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Area Group Attended</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CFO Attended</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Offices Attended</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {weekly.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.week}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.areaGroup}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.cfo}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.offices}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No weekly attendance data available.</p>
          )}
          {/* Placeholder for Recharts BarChart */}
          <p className="mt-4 text-gray-500 dark:text-gray-400 italic">
            (Charts would be rendered here using a library like Recharts for a full implementation.)
          </p>
        </div>

        {/* Monthly Attendance */}
        <div>
          <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Monthly Attendance by Group</h3>
          {monthly.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Month</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Area Group Attended</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CFO Attended</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Offices Attended</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {monthly.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.month}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.areaGroup}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.cfo}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{data.offices}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No monthly attendance data available.</p>
          )}
          {/* Placeholder for Recharts BarChart */}
          <p className="mt-4 text-gray-500 dark:text-gray-400 italic">
            (Charts would be rendered here using a library like Recharts for a full implementation.)
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
