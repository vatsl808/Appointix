import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import AppointmentList from '../components/AppointmentList';
import EditAppointmentModal from '../components/EditAppointmentModal';
import '../styles/dashboard.css';
import '../styles/main.css';
import '../styles/modal.css';

// Mock Availability Data (needed for EditAppointmentModal validation)
// TODO: Refactor mock data into a shared location or fetch dynamically if needed
const defaultAvailability = {
  Monday:    { startTime: "09:00", endTime: "13:00", isAvailable: true },
  Tuesday:   { startTime: "09:00", endTime: "13:00", isAvailable: true },
  Wednesday: { startTime: "09:00", endTime: "13:00", isAvailable: true },
  Thursday:  { startTime: "09:00", endTime: "13:00", isAvailable: true },
  Friday:    { startTime: "09:00", endTime: "13:00", isAvailable: true },
  Saturday:  { startTime: "10:00", endTime: "12:00", isAvailable: false },
  Sunday:    { startTime: "",      endTime: "",      isAvailable: false },
};
const mockDoctorAvailability = {
  1: { ...defaultAvailability }, // Dr. Smith
  2: { // Dr. Johnson
    ...defaultAvailability,
    Wednesday: { startTime: "14:00", endTime: "18:00", isAvailable: true },
    Friday:    { startTime: "", endTime: "", isAvailable: false },
  },
  3: { ...defaultAvailability }, // Dr. Williams
};


function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(''); // Clear previous errors
      const token = localStorage.getItem('token');
      const userType = localStorage.getItem('userType');

      // Authorization Check: Must be logged in AND be a patient
      if (!token || userType !== 'patient') {
        console.error("Authorization Error: User is not a logged-in patient.");
        navigate('/access-denied'); // Redirect if not authorized
        return; // Stop further execution in this effect
      }

      try {
        const response = await fetch('http://localhost:5001/api/appointments/patient', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Add doctorId to fetched data if backend doesn't include it but modal needs it
        // (Assuming backend returns doctorId now based on model)
        setAppointments(data);

      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError(err.message || 'Failed to load appointments.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []); // Empty dependency array means run once on mount

  const handleCancel = async (appointmentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication required to cancel.");
      return;
    }

    // Optional: Confirm before cancelling
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    setError(''); // Clear previous errors
    try {
      const response = await fetch(`http://localhost:5001/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Update state to reflect cancellation (change status or remove)
      // Option 1: Change status locally
      setAppointments(prevAppointments =>
        prevAppointments.map(app =>
          app.id === appointmentId ? { ...app, status: 'cancelled' } : app
        )
      );
      // Option 2: Remove from list locally (if you prefer not to show cancelled ones)
      // setAppointments(prevAppointments => prevAppointments.filter(a => a.id !== appointmentId));

      alert(result.message || "Appointment cancelled successfully.");

    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError(err.message || 'Failed to cancel appointment.');
    }
  };

  // --- Edit Modal Handlers ---
  const handleEditRequest = (appointment) => {
    console.log("Editing appointment:", appointment);
    // Ensure we have doctorId on the appointment object
    if (!appointment.doctorId) {
        console.error("Cannot edit appointment: doctorId is missing.", appointment);
        setError("Cannot edit this appointment: missing doctor information.");
        return;
    }
    setAppointmentToEdit(appointment);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setAppointmentToEdit(null);
  };

  const handleUpdateAppointment = (updatedData) => {
    // updatedData should contain { id, date, time }
    console.log("Updating appointment (mock):", updatedData);
    // TODO: Implement API call (PUT /api/appointments/:id)
    setAppointments(prevAppointments =>
      prevAppointments.map(app =>
        app.id === updatedData.id
          ? { ...app, date: updatedData.date, time: updatedData.time }
          : app
      )
    );
    handleCloseEditModal();
    alert("Appointment rescheduled (mock)!");
  };
  // --- End Edit Modal Handlers ---


  if (loading) {
    return <div className="loading">Loading appointments...</div>;
  }

  return (
    <div className="dashboard-page page-container"> {/* Added page-container */}
      <div className="container"> {/* Added container */}
        <div className="dashboard-header">
          <h2>My Dashboard</h2>
        </div>

        {/* Display error if any */}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>Upcoming & Past Appointments</h3>
            <Link to="/doctors" className="btn btn-primary">
              Book New Appointment
            </Link>
          </div>
          <AppointmentList
            appointments={appointments}
            onCancel={handleCancel}
            onEditRequest={handleEditRequest}
            userType="patient"
          />
        </div>

        {/* Render the Edit Modal */}
        <EditAppointmentModal
          isOpen={isEditModalOpen}
          appointment={appointmentToEdit}
          // Pass the correct availability schedule based on the doctorId of the appointment being edited
          doctorAvailability={appointmentToEdit ? (mockDoctorAvailability[appointmentToEdit.doctorId] || defaultAvailability) : null}
          onUpdate={handleUpdateAppointment}
          onClose={handleCloseEditModal}
        />
      </div> {/* Close container */}
    </div> // Close dashboard-page
  );
}

export default PatientDashboard;
