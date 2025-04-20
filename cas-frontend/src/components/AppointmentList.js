import React from 'react';
import { FaPen, FaTimes } from 'react-icons/fa'; // Import edit icon

// Added onEditRequest prop
function AppointmentList({ appointments, onCancel, onComplete, onEditRequest, userType }) {

  return (
    <div className="appointment-list"> {/* This class matches the CSS for the container */}
      {appointments.length === 0 ? (
        <p className="no-appointments">No appointments found.</p> /* Use the dedicated class */
      ) : (
        // Removed the <ul>, using divs directly for grid items
        appointments.map(appointment => (
          <div key={appointment.id} className="appointment-item"> {/* Each item is a grid row */}

            {/* Column 1: Details */}
            <div className="appointment-details">
              <div className="detail-row">
                <span className="detail-label">
                  {userType === 'patient' ? 'Doctor:' : 'Patient:'}
                </span>
                <span className="detail-value">
                  {userType === 'patient' ? appointment.doctorName : appointment.patientName || 'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">{appointment.reason || 'N/A'}</span>
              </div>
            </div>

            {/* Column 2: Date & Time */}
            <div className="appointment-date-time">
              {appointment.date} <br /> {appointment.time}
            </div>

            {/* Column 3: Status Badge */}
            <div className="appointment-status-wrapper">
              <span className={`appointment-status status-${appointment.status?.toLowerCase()}`}>
                {appointment.status}
              </span>
            </div>

            {/* Column 4: Actions */}
            <div className="appointment-actions">
              {/* Patient Actions */}
              {userType === 'patient' && appointment.status === 'upcoming' && (
                <>
                  <button
                    onClick={() => onEditRequest(appointment)} // Pass the whole appointment object
                    className="btn btn-warning btn-sm" // Use warning color for edit
                    title="Edit Appointment" // Add tooltip
                  >
                    <FaPen /> {/* Edit Icon */}
                  </button>
                  <button
                    onClick={() => onCancel(appointment.id)}
                    className="btn btn-danger btn-sm"
                    title="Cancel Appointment" // Add tooltip
                  >
                    <FaTimes /> {/* Cancel Icon */}
                  </button>
                </>
              )}
              {/* Doctor Actions */}
              {userType === 'doctor' && appointment.status === 'upcoming' && (
                <button
                  onClick={() => onComplete(appointment.id)}
                  className="btn btn-success btn-sm" /* Added btn-sm */
                >
                  Mark Complete
                </button>
              )}
              {/* Add other actions if needed, e.g., Reschedule */}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AppointmentList;
