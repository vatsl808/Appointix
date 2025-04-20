import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserMd, FaClock } from 'react-icons/fa'; // Add FaClock icon
import { formatAvailabilitySummary } from '../utils/availabilityUtils'; // Import the helper

// Assume doctor object has { id, name, specialization, bio (optional), profilePictureUrl (optional) }
function DoctorCard({ doctor }) {

  // Helper function to construct full image URL
  const getFullImageUrl = (relativePath) => {
    if (relativePath && relativePath.startsWith('/uploads')) {
      // Ensure the backend URL is correct (http://localhost:5001)
      return `http://localhost:5001${relativePath}`;
    }
    // Return null or the original path if it's not a relative upload path
    return relativePath;
  };

  const imageUrl = getFullImageUrl(doctor.profilePictureUrl);

  return (
    <div className="doctor-card">
      {/* Conditionally render image or placeholder */}
      {imageUrl ? (
         <img src={imageUrl} alt={`${doctor.name}'s profile`} className="doctor-card-image" />
      ) : (
        <div className="doctor-card-image-placeholder">
           <FaUserMd /> {/* Placeholder Icon */}
        </div>
      )}

      {/* Card Content */}
      <div className="doctor-card-content">
        {/* Header */}
        <div className="doctor-card-header">
          <h3 className="doctor-name">{doctor.name || 'Doctor Name'}</h3>
          <p className="doctor-specialty">{doctor.specialization || 'Specialization'}</p>
        </div>

        {/* Body (Optional) */}
        <div className="doctor-card-body">
          {/* Display Bio or default text */}
          {doctor.bio && <p className="doctor-bio">{doctor.bio}</p>}
          {!doctor.bio && <p className="doctor-bio">Experienced medical professional dedicated to patient care.</p>}

          {/* Display Availability Summary */}
          {doctor.availability && (
            <p className="doctor-availability">
              <FaClock className="availability-icon" /> {/* Add icon */}
              {formatAvailabilitySummary(doctor.availability)}
            </p>
          )}
        </div>
      </div>

      {/* Footer with Action Button */}
      <div className="doctor-card-footer">
        <Link to={`/book/${doctor.id}`} className="btn btn-primary"> {/* Added btn-primary */}
          Book Appointment
        </Link>
      </div>
    </div>
  );
}

export default DoctorCard;
