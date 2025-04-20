import React, { useState, useEffect } from 'react'; // Ensure React is imported
import DoctorCard from '../components/DoctorCard';
import '../styles/doctor-list.css';
import '../styles/main.css'; // Ensure main styles are loaded

function DoctorListPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // Add error state

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch from the backend API (running on port 5001)
        const response = await fetch('http://localhost:5001/api/doctors');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDoctors(data);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setError('Failed to load doctors. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return <div className="loading">Loading doctors...</div>;
  }

  // Display error message if fetch failed
  if (error) {
    return <div className="container page-container error-doctors">{error}</div>;
  }

  return (
    <div className="doctor-list-page">
      {/* Use the header class from CSS */}
      <div className="doctor-list-header">
        <h2>Available Doctors</h2>
        {/* Optional: Add subtitle <p>Find the right specialist for your needs.</p> */}
      </div>
      {/* Use the correct grid class name */}
      <div className="doctors-grid">
        {doctors.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}

export default DoctorListPage;
