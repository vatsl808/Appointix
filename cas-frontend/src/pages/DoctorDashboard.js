import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import AppointmentList from '../components/AppointmentList';
import '../styles/dashboard.css';
import '../styles/main.css';

function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const userType = localStorage.getItem('userType');

      // Authorization Check: Must be logged in AND be a doctor
      if (!token || userType !== 'doctor') {
        console.error("Authorization Error: User is not a logged-in doctor.");
        navigate('/access-denied'); // Redirect if not authorized
        return; // Stop further execution in this effect
      }

      try {
        const response = await fetch('http://localhost:5001/api/appointments/doctor', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAppointments(data);

      } catch (err) {
        console.error('Error fetching doctor appointments:', err);
        setError(err.message || 'Failed to load appointments.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []); // Empty dependency array means run once on mount

  const handleComplete = async (appointmentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication required to complete appointment.");
      return;
    }
    setError(''); // Clear previous errors

    // Optimistic UI update (optional but good UX)
    // Update the status locally first
    setAppointments(prevAppointments =>
      prevAppointments.map(a =>
        a.id === appointmentId ? { ...a, status: 'completed' } : a
      )
    );

    try {
      const response = await fetch(`http://localhost:5001/api/appointments/${appointmentId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // No Content-Type needed for PUT with no body
        }
      });

      const result = await response.json(); // Still parse potential error messages

      if (!response.ok) {
        // Revert optimistic update on error
        setAppointments(prevAppointments =>
          prevAppointments.map(a =>
            a.id === appointmentId ? { ...a, status: 'upcoming' } : a // Revert status
          )
        );
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Success: Local state is already updated optimistically
      console.log(result.message || "Appointment marked complete.");
      // Optionally show a success alert: alert(result.message || "Appointment marked complete.");

    } catch (err) {
      console.error('Error completing appointment:', err);
      setError(err.message || 'Failed to mark appointment as complete.');
      // Revert optimistic update if API call failed after initial state change
       setAppointments(prevAppointments =>
          prevAppointments.map(a =>
            a.id === appointmentId ? { ...a, status: 'upcoming' } : a // Revert status
          )
       );
       alert(`Error: ${err.message || 'Failed to mark appointment as complete.'}`); // Show error alert
    }
  };

  if (loading) {
    return <div className="loading">Loading appointments...</div>;
  }

  // Handle error state by returning error message
  if (error) {
    return (
      <div className="dashboard-page page-container">
         <div className="container">
            <div className="alert alert-danger">{error}</div>
         </div>
      </div>
    );
  }

  // Render dashboard content if no error and not loading
  return (
    <div className="dashboard-page page-container">
      <div className="container">
        <div className="dashboard-header">
          <h2>Doctor Dashboard</h2>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>Your Appointments</h3>
            {/* No button needed here */}
          </div>
          <AppointmentList
            appointments={appointments}
            onComplete={handleComplete} // Pass the completion handler
            userType="doctor"
            // No onCancel or onEditRequest needed for doctor view
          />
        </div>
      </div> {/* Close container */}
    </div> //
  );
}

export default DoctorDashboard;
