import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppointmentForm from '../components/AppointmentForm';
import { isTimeSlotAvailable } from '../utils/availabilityUtils'; // Import validation function
import '../styles/appointment.css';
import '../styles/main.css';

// Removed Mock Data definitions

function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState(null); // State for availability
  const [loading, setLoading] = useState(true);
  const [bookingError, setBookingError] = useState(''); // State for initial loading errors
  const [submissionError, setSubmissionError] = useState(''); // State for form submission errors

  useEffect(() => {
    // --- Authorization Check ---
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'patient') {
      console.error("Authorization Error: User is not a logged-in patient.");
      navigate('/access-denied'); // Redirect if not authorized
      return; // Stop further execution
    }
    // --- End Authorization Check ---

    const fetchDoctorData = async () => {
      setLoading(true);
      setBookingError('');
      try {
        const response = await fetch(`http://localhost:5001/api/doctors/${doctorId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // Add the Authorization header
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Successfully fetched doctor data:", data); // Log success
        setDoctor(data);
        setDoctorAvailability(data.availability); // Availability is included in the response
      } catch (err) {
        console.error('Error fetching doctor details:', err);
        console.error("Caught error in fetchDoctorData:", err); // Log the full error object
        setBookingError(err.message || 'Failed to load doctor details.');
        setDoctor(null); // Ensure no stale doctor data is shown on error
        setDoctorAvailability(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [doctorId]); // Re-fetch if doctorId changes

  const handleSubmit = async (appointmentData) => {
    setSubmissionError(''); // Clear previous submission errors

    // --- Availability Check ---
    // This check might be redundant if fetchDoctorData handles it, but keep as safeguard
    if (!doctorAvailability) {
      setSubmissionError('Doctor availability information is not available. Cannot book.');
      return;
    }
    const isAvailable = isTimeSlotAvailable(
      doctorAvailability,
      appointmentData.date,
      appointmentData.time
    );

    if (!isAvailable) {
      setSubmissionError(`Sorry, Dr. ${doctor.name} is not available at the selected time. Please choose a different time.`);
      return; // Stop submission
    }
    // --- End Availability Check ---

    try {
      // Get token from local storage
      const token = localStorage.getItem('token');
      // This check might be redundant if the page-level auth handles it, but keep as safeguard
      if (!token) {
        setSubmissionError('Authentication error. Please log in again.');
        return;
      }

      // Prepare data for API
      const bookingPayload = {
        // Send the doctorId string directly (it's the MongoDB ObjectId string from the URL)
        doctorId: doctorId,
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason
      };

      // Call the backend booking API
      const response = await fetch('http://localhost:5001/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Send token for authentication
        },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle errors from the backend (e.g., slot taken, server error)
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Booking successful
      console.log('Booking successful:', result.message);
      alert('Appointment booked successfully!'); // Give user feedback
      navigate('/patient-dashboard'); // Redirect after successful booking

    } catch (err) {
      console.error('Error submitting booking:', err);
      setSubmissionError(err.message || 'An error occurred while booking. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading doctor details...</div>;
  }

  // Display error *before* checking for doctor, so it always shows if there was a fetch problem
  // Display error *before* checking for doctor, so it always shows if there was a fetch problem
  if (bookingError) {
    // Add inline style for top margin specifically for this error display scenario
    return <div className="container page-container error"><div className="alert alert-danger" style={{ marginTop: 'calc(var(--spacing-unit) * 4)' }}>{bookingError}</div></div>;
  }

  if (!doctor) {
     // This case should now primarily happen if fetch succeeded but data was unexpectedly null/empty
     // Or if loading is done but error state wasn't set (less likely)
    return <div className="container page-container error">Doctor data not available.</div>;
  }

  return (
    // Use the main container class from appointment.css
    <div className="book-appointment-page">
      <div className="appointment-form-container"> {/* Wrap form in the styled container */}
        <div className="book-appointment-header">
          <h2>Book Appointment</h2> {/* Use h2 for consistency */}
          <p className="doctor-info">
            with Dr. {doctor.name} ({doctor.specialization})
          </p>
        </div>
        {/* Display submission error message INSIDE the form container */}
        {submissionError && <div className="alert alert-danger" style={{ marginBottom: 'var(--spacing-unit)' }}>{submissionError}</div>}
        <AppointmentForm doctorId={doctorId} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}

export default BookAppointmentPage;
