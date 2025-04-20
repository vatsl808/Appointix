import React, { useState, useEffect } from 'react';
import { isTimeSlotAvailable } from '../utils/availabilityUtils'; // Import validation function
import '../styles/modal.css';

// Added doctorAvailability prop
function EditAppointmentModal({ isOpen, appointment, doctorAvailability, onUpdate, onClose }) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [validationError, setValidationError] = useState(''); // State for validation error

  // Update local state and clear error when the modal opens/closes or appointment data changes
  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(appointment.date);
      setNewTime(appointment.time);
      setValidationError(''); // Clear error when opening for a new appointment
    } else if (!isOpen) {
      setValidationError(''); // Clear error when closing
    }
  }, [isOpen, appointment]); // Rerun when isOpen or appointment changes

  const handleSubmit = async (e) => { // Added async keyword
    e.preventDefault();
    setValidationError(''); // Clear previous error
    if (!appointment || !doctorAvailability) return;

    // --- Availability Check ---
    const isAvailable = isTimeSlotAvailable(
      doctorAvailability,
      newDate,
      newTime
    );

    if (!isAvailable) {
      setValidationError(`Sorry, the doctor is not available at the selected time (${newTime} on ${newDate}). Please choose a different time.`);
      return; // Stop submission
    }
    // --- End Availability Check ---

    // Proceed with API call if validation passes
    const updatePayload = {
      date: newDate,
      time: newTime,
    };

    const token = localStorage.getItem('token');
    if (!token) {
      setValidationError("Authentication error. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Call the parent's onUpdate handler to update the UI state
      onUpdate({
        id: appointment.id, // Pass ID back for state update
        date: newDate,
        time: newTime,
      });
      // onClose(); // onUpdate now handles closing

    } catch (err) {
       console.error("Error updating appointment:", err);
       setValidationError(err.message || "Failed to reschedule appointment.");
    }
  };

  if (!isOpen || !appointment) {
    return null; // Don't render anything if modal is closed or no appointment data
  }

  // Add the 'open' class to backdrop when isOpen is true
  return (
    <div className={`modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Reschedule Appointment</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <p><strong>Doctor:</strong> {appointment.doctorName}</p>
          <p><strong>Reason:</strong> {appointment.reason}</p>
          <hr />
          {/* Display validation error */}
          {validationError && <p className="alert alert-danger">{validationError}</p>}
          <form onSubmit={handleSubmit} className="edit-appointment-form">
            <div className="form-group">
              <label htmlFor="edit-date">New Date:</label>
              <input
                type="date"
                id="edit-date"
                className="form-control"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-time">New Time:</label>
              <input
                type="time"
                id="edit-time"
                className="form-control"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
              />
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditAppointmentModal;
