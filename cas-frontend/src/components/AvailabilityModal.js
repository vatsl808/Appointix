import React, { useState, useEffect } from 'react';
// Remove TimePicker and FaClock imports
import '../styles/modal.css';
import '../styles/availability.css';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function AvailabilityModal({ isOpen, currentAvailability, onUpdate, onClose }) {
  const [schedule, setSchedule] = useState({});
  // No refs or icon handlers needed

  // Initialize local state when the modal opens or availability data changes
  useEffect(() => {
    // Revert to simpler initialization
    if (currentAvailability) {
      setSchedule(JSON.parse(JSON.stringify(currentAvailability))); // Deep copy
    } else {
       // Ensure schedule is initialized if currentAvailability is null/undefined initially
       const initialSchedule = {};
       daysOfWeek.forEach(day => {
          initialSchedule[day] = { startTime: '', endTime: '', isAvailable: false };
       });
       setSchedule(initialSchedule);
    }
  }, [currentAvailability, isOpen]); // Re-initialize if the prop changes while open or modal opens

  const handleCheckboxChange = (day, checked) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], isAvailable: checked }
    }));
  };

  const handleTimeChange = (day, timeType, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [timeType]: value }
    }));
  };

  // Remove handleIconClick function - TimePicker handles its own opening

  const handleSubmit = async (e) => { // Make async
    e.preventDefault();
    console.log("Attempting to save schedule from modal:", schedule);

    const token = localStorage.getItem('token');
    if (!token) {
      // Handle error - maybe show message in modal or rely on parent
      console.error("Authentication token not found.");
      alert("Authentication error. Please log in again.");
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/doctors/me/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(schedule) // Send the entire schedule object
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Call parent's onUpdate handler ONLY on successful API call
      onUpdate(schedule); // Pass the updated schedule back to update parent state
      // onClose(); // onUpdate now handles closing in parent

      alert(result.message || "Availability updated successfully!"); // Give feedback

    } catch (err) {
      console.error("Error updating availability:", err);
      // TODO: Display error message within the modal
      alert(`Error updating availability: ${err.message}`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="modal-container availability-modal-container"> {/* Add specific class */}
        <div className="modal-header">
          <h2>Set Weekly Availability</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}> {/* Ensure onSubmit is present */}
          <div className="modal-body availability-modal-body">
            {daysOfWeek.map(day => (
              <div key={day} className="availability-day-row">
                <label className="day-label">{day}</label>
                <div className="day-controls">
                  <input
                    type="checkbox"
                    id={`available-${day}`}
                    checked={schedule[day]?.isAvailable || false}
                    onChange={(e) => handleCheckboxChange(day, e.target.checked)}
                    className="availability-checkbox"
                  />
                  <label htmlFor={`available-${day}`} className="availability-toggle-label">
                    {schedule[day]?.isAvailable ? 'Available' : 'Unavailable'}
                  </label>
                  <div className="time-inputs">
                    {/* Revert to plain native input */}
                    <input
                      type="time"
                      id={`start-${day}`}
                      value={schedule[day]?.startTime || ''}
                      onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                      disabled={!schedule[day]?.isAvailable}
                      className="form-control time-input" // Use .time-input for styling
                      required={schedule[day]?.isAvailable}
                    />
                    <span> - </span>
                    {/* Revert to plain native input */}
                    <input
                      type="time"
                      id={`end-${day}`}
                      value={schedule[day]?.endTime || ''}
                      onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                      disabled={!schedule[day]?.isAvailable}
                      className="form-control time-input" // Use .time-input for styling
                      required={schedule[day]?.isAvailable}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Save Availability
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AvailabilityModal;
