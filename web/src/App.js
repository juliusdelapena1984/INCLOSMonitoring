import React, { useState, useEffect } from 'react';

// Main App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [missions, setMissions] = useState([]);
  const [allChurchMembers, setAllChurchMembers] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [evangelicalWorkers, setEvangelicalWorkers] = useState([]);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [message, setMessage] = useState('');

  // New state for week navigation: 0 for current week, -1 for previous, 1 for next, etc.
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [displayedMissions, setDisplayedMissions] = useState([]);
  const [currentWeekDisplay, setCurrentWeekDisplay] = useState(''); // To display "Week X (Start Date - End Date)"

  // State for MemberGuestsModal, lifted from MembersSelectionTable
  const [showMemberGuestsModal, setShowMemberGuestsModal] = useState(false);
  const [currentMemberForGuests, setCurrentMemberForGuests] = useState(null);
  const [currentMemberGuestsInput, setCurrentMemberGuestsInput] = useState(''); // To hold the guest input for the modal

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
    // Calculate the day of the week: 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const dayOfWeek = today.getDay();

    // Set to the start of the current week (Monday)
    // If today is Sunday (0), subtract 6 days to get previous Monday.
    // Otherwise, subtract (dayOfWeek - 1) days to get current Monday.
    const startOfCurrentWeek = new Date(today.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)));

    // Apply the offset to get the start of the target week
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfTargetWeek.getDate() + (offset * 7));

    const endOfTargetWeek = new Date(startOfTargetWeek);
    endOfTargetWeek.setDate(endOfTargetWeek.getDate() + 6); // End of week (Sunday)

    // Format dates for display
    const formattedStartDate = getFormattedDate(startOfTargetWeek);
    const formattedEndDate = getFormattedDate(endOfTargetWeek);

    // Calculate week number for display (optional, can be simplified to date range)
    // This is a simplified week number. For ISO week numbers, more complex logic is needed.
    const yearStart = new Date(startOfTargetWeek.getFullYear(), 0, 1);
    const daysSinceYearStart = (startOfTargetWeek.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
    const weekNum = Math.ceil(daysSinceYearStart / 7) + 1; // +1 because week 1 starts on day 1

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
      // Ensure mission.date is a string in YYYY-MM-DD format for comparison
      return mission.date >= startDate && mission.date <= endDate;
    });
    setDisplayedMissions(filtered);
  }, [missions, currentWeekOffset]); // Re-filter when missions or week offset changes

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  // Open modal for adding a new mission
  const handleOpenAddModal = () => {
    setEditingMission(null);
    setShowMissionModal(true);
  };

  // Open modal for editing an existing mission
  const handleOpenEditModal = (mission) => {
    setEditingMission(mission);
    setShowMissionModal(true);
  };

  // Handle saving (add or update) a mission
  const handleSaveMissionSubmit = async (missionData) => {
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
      fetchData(); // Refresh all data after save
    } catch (error) {
      console.error('Error saving mission:', error);
      setMessage('Failed to save mission. Please try again.');
    }
  };

  // --- MemberGuestsModal handlers (lifted to App component) ---
  const handleOpenMemberGuestsModal = (member, initialGuests) => {
    setCurrentMemberForGuests(member);
    setCurrentMemberGuestsInput(initialGuests); // Set initial guests for the textarea
    setShowMemberGuestsModal(true);
  };

  const handleSaveMemberGuests = (memberId, guestsString) => {
    // Find the mission currently being edited in the MissionModal
    // This assumes MemberGuestsModal is only opened when MissionModal is active
    if (editingMission) {
      const updatedAttendedMembers = editingMission.attendedMembers.map(m =>
        m.memberId === memberId ? { ...m, memberGuests: guestsString } : m
      );
      // Update the editingMission state directly
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


  // Effect to clear messages after a delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-sm w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome</h1>
          <p className="text-gray-600 mb-8">Please log in to access the Bible Mission Monitoring system.</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            Simulate Google Login
          </button>
          {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans flex flex-col items-center">
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <div className="text-gray-600 text-sm">Locale of Elizabeth, District of New Jersey</div>
        <button
          onClick={handleSignOut}
          className="bg-white text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-200 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
        >
          Sign Out
        </button>
      </header>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-10 text-center">
        Light Of Salvation Bible Mission Monitoring
      </h1>
      {message && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg relative mb-6 w-full max-w-6xl text-center" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      {/* Week Navigation and Display */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
        <button
          onClick={handlePrevWeek}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          &larr; Previous Week
        </button>
        <span className="text-lg font-semibold text-gray-800">
          {currentWeekDisplay}
        </span>
        <button
          onClick={handleNextWeek}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
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
          <div className="col-span-full text-center py-8 text-gray-600">
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
          // Pass MemberGuestsModal handlers and state down
          onOpenMemberGuestsModal={handleOpenMemberGuestsModal}
          onSaveMemberGuests={handleSaveMemberGuests}
        />
      )}

      {/* Render MemberGuestsModal directly in App component */}
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

const MissionCard = ({ mission, onEditClick }) => {
  const attendedCount = mission.attendedMembers ? mission.attendedMembers.length : 0;

  return (
    <div
      className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow duration-300"
      onClick={() => onEditClick(mission)}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {mission.date} {mission.time}
        </h3>
        <p className="text-gray-700 text-base mb-4">{mission.location}</p>
        <div className="text-gray-600 text-sm space-y-1">
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
          <p className="text-gray-800 font-medium">{mission.workerName}</p>
        </div>
      </div>
    </div>
  );
};

// Updated MissionModal to pass MemberGuestsModal handlers
const MissionModal = ({ initialMissionData, allChurchMembers, allVenues, evangelicalWorkers, onSave, onClose, onOpenMemberGuestsModal, onSaveMemberGuests }) => {
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
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={missionFormState.date}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                id="time"
                name="time"
                value={missionFormState.time}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
              <select
                id="location"
                name="location"
                value={missionFormState.location}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a venue</option>
                {allVenues.map(venue => (
                  <option key={venue.id} value={venue.name} />
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nonMemberGuests" className="block text-sm font-medium text-gray-700">Other Guests (CSV format)</label>
              <input
                type="text"
                id="nonMemberGuests"
                name="nonMemberGuests"
                value={missionFormState.nonMemberGuests}
                onChange={handleFormChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., John, Mary, 2 others"
              />
            </div>
            <div>
              <label htmlFor="workerName" className="block text-sm font-medium text-gray-700">Worker Name</label>
              <input
                type="text"
                id="workerName"
                name="workerName"
                value={missionFormState.workerName}
                onChange={handleWorkerNameChange}
                list="worker-names-datalist"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="workerImagePreview" className="block text-sm font-medium text-gray-700">Worker Image Preview</label>
              <img
                id="workerImagePreview"
                src={missionFormState.workerImage || 'https://placehold.co/40x40/CCCCCC/000000?text=NA'}
                alt="Worker Preview"
                className="w-10 h-10 rounded-full mt-1 object-cover border-2 border-gray-300"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/CCCCCC/000000?text=NA'; }}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Attended Members & Their Guests</h3>
            <MembersSelectionTable
              allChurchMembers={allChurchMembers}
              selectedMembers={missionFormState.attendedMembers}
              onSelectionChange={handleAttendedMembersChange}
              // Pass the lifted handler for opening MemberGuestsModal
              onOpenMemberGuestsModal={onOpenMemberGuestsModal}
            />
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
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

// Updated MembersSelectionTable to use the lifted handler
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
    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
      <div className="p-2 bg-white border-b border-gray-200 sticky top-0 z-20 flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name, Area Group, CFO, or Offices..."
          value={filterText}
          onChange={handleFilterChange}
          className="w-full sm:w-auto flex-grow p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex-shrink-0 flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ATTENDED')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'ATTENDED' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ATTENDED
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ABSENT')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'ABSENT' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ABSENT
          </button>
        </div>
      </div>
      {filteredAndTabbedMembers.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 sticky top-[56px] z-10">
            <tr>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attended
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Area Group
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CFO
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Offices
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guests
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndTabbedMembers.map((member) => {
              const isAttended = selectedMembers.some(m => m.memberId === member.id);
              const memberGuests = getMemberGuests(member.id);
              return (
                <tr key={member.id}>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={isAttended}
                      onChange={() => handleCheckboxChange(member.id)}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                    {member.fullName}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700">
                    {member.areaGroup}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700">
                    {member.cfo}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700">
                    {member.offices}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700 flex items-center">
                    <span className="truncate max-w-[100px] mr-2">{memberGuests || 'N/A'}</span>
                    {isAttended && (
                      <button
                        type="button"
                        onClick={() => onOpenMemberGuestsModal(member, memberGuests)} // Pass member and current guests
                        className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <p className="text-gray-500 text-center py-4">No church members found matching your filter.</p>
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
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Guests for {member.fullName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="memberGuests" className="block text-sm font-medium text-gray-700">Guest Names (CSV format)</label>
            <textarea
              id="memberGuests"
              name="memberGuests"
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              rows="4"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Jane's Mom, John's Kids"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
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
      className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-center border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-300 ease-in-out"
      style={{ minHeight: '200px' }}
    >
      <div className="text-center">
        <div className="text-gray-500 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 mx-auto text-gray-400 hover:text-blue-500 transition-colors duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-700">Add New Bible Mission</p>
      </div>
    </div>
  );
};

export default App;
