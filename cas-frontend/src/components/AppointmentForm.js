import React, { useState } from 'react'; // Ensure React is imported

function AppointmentForm({ doctorId, onSubmit }) {
  const [appointment, setAppointment] = useState({
    date: '',
    time: '',
    reason: '',
    doctorId: doctorId
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAppointment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(appointment);
  };

  return (
    // Use the grid layout class from appointment.css
    <form className="appointment-form appointment-form-grid" onSubmit={handleSubmit}>
      {/* Date field - first column */}
      <div className="form-group">
        <label htmlFor="date">Date</label> {/* Added htmlFor */}
        <input
          type="date"
          id="date" // Added id
          name="date"
          className="form-control" // Added form-control class
          value={appointment.date}
          onChange={handleChange}
          required
        />
      </div>
      {/* Time field - second column */}
      <div className="form-group">
        <label htmlFor="time">Time</label> {/* Added htmlFor */}
        <input
          type="time"
          id="time" // Added id
          name="time"
          className="form-control" // Added form-control class
          value={appointment.time}
          onChange={handleChange}
          required
        />
      </div>
      {/* Reason field - spans both columns */}
      <div className="form-group full-width"> {/* Added full-width class */}
        <label htmlFor="reason">Reason for Visit</label> {/* Added htmlFor */}
        <textarea
          id="reason" // Added id
          name="reason"
          className="form-control" // Added form-control class
          value={appointment.reason}
          onChange={handleChange}
          required
        />
      </div>
      {/* Submit button - spans both columns */}
      <button type="submit" className="btn btn-primary"> {/* Use btn-primary */}
        Book Appointment
      </button>
    </form>
  );
}

export default AppointmentForm;
