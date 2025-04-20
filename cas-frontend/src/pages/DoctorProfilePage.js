import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { FaUserMd } from 'react-icons/fa';
import AppointmentList from '../components/AppointmentList';
import AvailabilityModal from '../components/AvailabilityModal';
import EditProfileModal from '../components/EditProfileModal';
import '../styles/profile.css';
import '../styles/main.css';
import '../styles/availability.css';
import '../styles/modal.css';

// No more mock data here

function DoctorProfilePage() {
  const { id } = useParams(); // Get doctor ID from URL param
  const navigate = useNavigate(); // Hook for navigation
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [appointmentHistory, setAppointmentHistory] = useState([]); // Will be fetched later
  const [doctorAvailability, setDoctorAvailability] = useState(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    // --- Authorization Check ---
    const loggedInUserType = localStorage.getItem('userType');
    const loggedInDoctorId = localStorage.getItem('doctorId'); // Stored as string
    const token = localStorage.getItem('token'); // Also check if token exists

    // Check if logged in, if user is a doctor, and if the ID matches the URL param
    console.log("Auth Check Values:"); // <-- Add logging
    console.log("  Token exists:", !!token);
    console.log("  User Type:", loggedInUserType);
    console.log("  Is Doctor:", loggedInUserType === 'doctor');
    console.log("  Stored Doctor ID:", loggedInDoctorId);
    console.log("  URL ID:", id);
    console.log("  IDs Match:", loggedInDoctorId === id); // Use strict equality for clarity
    console.log("  Stored Doctor ID exists:", !!loggedInDoctorId);

    // Convert both IDs to numbers for reliable comparison if needed, though string comparison works here.
    // Using strict equality (===) for comparison now for clarity
    if (!token || loggedInUserType !== 'doctor' || !loggedInDoctorId || loggedInDoctorId !== id) {
      console.error("Authorization Error: User cannot access this profile or is not logged in correctly.");
      // Instead of setting an error, navigate to the Access Denied page
      navigate('/access-denied');
      return; // Stop fetching data and prevent further rendering of this page
    }
    // --- End Authorization Check ---

    // If authorized, proceed to fetch data
    const fetchDoctorProfile = async () => {
      setLoading(true);
      setError(''); // Clear previous errors before fetching
      try {
        // Fetch doctor details (including availability) from backend
        const response = await fetch(`http://localhost:5001/api/doctors/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}` // Add the Authorization header
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDoctor(data);
        setDoctorAvailability(data.availability);

        // Now fetch appointment history for this doctor (requires auth)
        // Use the 'token' variable already defined in the outer scope (line 33)
        if (token) { // Only fetch history if logged in (though profile might be public)
            const historyResponse = await fetch(`http://localhost:5001/api/appointments/doctor`, { // Assuming this endpoint gets appointments for the LOGGED IN doctor
                 headers: { 'Authorization': `Bearer ${token}` }
                 // NOTE: This fetches the LOGGED IN doctor's history, not necessarily the profile being viewed if they differ.
                 // A different endpoint might be needed like /api/doctors/:id/appointments if viewing other profiles.
                 // For now, we assume viewing own profile or this endpoint returns based on doctor_id if provided?
                 // Let's stick to fetching the logged-in doctor's history for simplicity.
            });
            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                // Filter history based on the profile ID being viewed, ONLY if backend doesn't do it.
                // This assumes the /api/appointments/doctor returns ALL appointments for the logged-in doc.
                // A better backend would filter by doctor_id if provided.
                // The backend endpoint /api/appointments/doctor already returns appointments
                // only for the logged-in doctor based on the token. No local filtering needed here.
                setAppointmentHistory(historyData);

            } else {
                 console.error("Failed to fetch appointment history");
                 // Don't necessarily set main error, maybe just log or show history error
            }
        } else {
             console.warn("No token found, cannot fetch appointment history.");
             // Leave history empty if not logged in or no token
             setAppointmentHistory([]);
        }


      } catch (err) {
        console.error('Error fetching doctor profile:', err);
        setError(err.message || 'Failed to load doctor profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [id]); // Re-fetch if ID changes

  // --- Handlers ---
  const handleProfilePicChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setProfilePicFile(null);
      setProfilePicPreview(null);
    }
  };

  // --- Profile Edit Modal Handlers ---
  const handleOpenEditProfileModal = () => {
    setProfilePicPreview(null); // Reset preview
    setProfilePicFile(null);
    setIsEditProfileModalOpen(true);
  };

  const handleCloseEditProfileModal = () => {
    setIsEditProfileModalOpen(false);
  };

  const handleUpdateProfile = (updatedProfileData) => {
    // updatedProfileData contains { phone, bio }
    console.log("Updating profile data (mock):", {
      ...updatedProfileData,
      pictureFile: profilePicFile ? profilePicFile.name : 'No new picture'
    });

    // TODO: Implement actual API call (PUT /api/doctors/me/profile)
    // For now, just update local state for display
    const updatedDoctor = {
      ...doctor,
      phone: updatedProfileData.phone,
      bio: updatedProfileData.bio,
      // If a picture was previewed, update the display URL (won't persist without backend)
      profilePictureUrl: profilePicPreview || doctor.profilePictureUrl
    };
    setDoctor(updatedDoctor);

    handleCloseEditProfileModal();
    setProfilePicPreview(null);
    setProfilePicFile(null);
    alert("Profile updated (mock)!"); // Mock success feedback
  };
  // --- End Profile Edit Modal Handlers ---


  // --- Availability Modal Handlers ---
  const handleOpenAvailabilityModal = () => {
    setIsAvailabilityModalOpen(true);
  };

  const handleCloseAvailabilityModal = () => {
    setIsAvailabilityModalOpen(false);
  };

  const handleUpdateAvailability = (newAvailability) => {
    console.log("Updating availability (mock):", newAvailability);
    // TODO: Implement actual API call (PUT /api/doctors/me/availability)
    setDoctorAvailability(newAvailability); // Update state locally
    // Update the main doctor state as well so it persists on page if needed
    setDoctor(prev => ({ ...prev, availability: newAvailability }));
    handleCloseAvailabilityModal();
    alert("Availability updated (mock)!"); // Mock success feedback
  };
  // --- End Availability Modal Handlers ---

  // --- Profile Picture Upload Handler ---
  const handleProfilePicUpload = async () => {
    if (!profilePicFile) {
      setUploadError("No picture selected to upload.");
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setUploadError("Authentication required.");
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('profilePic', profilePicFile); // Key must match backend ('profilePic')

    try {
      const response = await fetch('http://localhost:5001/api/doctors/me/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // 'Content-Type': 'multipart/form-data' is set automatically by browser for FormData
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Update doctor state with the new URL from backend
      setDoctor(prev => ({ ...prev, profilePictureUrl: result.profilePictureUrl }));
      setProfilePicPreview(null); // Clear preview
      setProfilePicFile(null); // Clear selected file
      alert("Profile picture updated successfully!");

    } catch (err) {
      console.error("Error uploading profile picture:", err);
      setUploadError(err.message || "Failed to upload picture.");
    } finally {
      setIsUploading(false);
    }
  };
  // --- End Profile Picture Upload Handler ---


  // --- Render Logic ---
  if (loading) return <div className="loading">Loading doctor profile...</div>;
  // If there was an authorization error set above, display it
  if (error) return <div className="container page-container error">{error}</div>;
  // This check might be redundant now due to the auth check, but keep as fallback
  if (!doctor) return <div className="container page-container">Doctor data unavailable.</div>;

  // Construct the full image URL if a relative path exists
  const getFullImageUrl = (relativePath) => {
    if (relativePath && relativePath.startsWith('/uploads')) {
      return `http://localhost:5001${relativePath}`; // Prepend backend URL
    }
    return relativePath; // Return as is if it's already a full URL or null/undefined
  };

  const displayImageUrl = profilePicPreview || getFullImageUrl(doctor.profilePictureUrl);

  return (
    // Apply page-level padding first
    <div className="profile-page page-container">
      {/* Then apply container to center content */}
      <div className="container">
        <h1>Doctor Profile</h1>

        {/* Combined Details Section */}
      <div className="profile-section profile-header-section">
        <div className="profile-picture-container">
          {displayImageUrl ? (
            <img src={displayImageUrl} alt={`${doctor.name}'s profile`} className="profile-picture" />
          ) : (
            <div className="profile-picture-placeholder"><FaUserMd /></div>
          )}
          {/* File input trigger */}
          <label htmlFor="profilePicInput" className="btn btn-secondary btn-sm upload-btn">
            {displayImageUrl ? 'Change Picture' : 'Upload Picture'}
          </label>
          <input
            type="file" id="profilePicInput" accept="image/*"
            onChange={handleProfilePicChange} style={{ display: 'none' }}
          />
          {/* Upload button - appears only when a new file is selected */}
          {profilePicFile && (
            <button onClick={handleProfilePicUpload} className="btn btn-primary btn-sm upload-confirm-btn" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Now'}
            </button>
          )}
          {/* Display upload error */}
          {uploadError && <p className="text-danger small mt-1">{uploadError}</p>}
        </div>

        <div className="profile-header-details">
          <h2>{doctor.name}</h2>
          <p className="profile-specialization">{doctor.specialization}</p>
          <p className="profile-email">
            <a href={`mailto:${doctor.email}`}>{doctor.email}</a>
          </p>

          <div className="profile-details">
            <div className="detail-item">
              <label>Phone:</label>
              <p>{doctor.phone || 'Not Provided'}</p>
            </div>
            <div className="detail-item">
              <label>Bio:</label>
              <p>{doctor.bio || 'Not Provided'}</p>
            </div>
          </div>

          <div className="profile-actions">
             {/* Buttons are only relevant if viewing own profile, which is enforced by useEffect check */}
             {/* Buttons are only relevant if viewing own profile, which is enforced by the useEffect check */}
             <button onClick={handleOpenEditProfileModal} className="btn btn-secondary btn-sm">Edit Profile</button>
             <button onClick={handleOpenAvailabilityModal} className="btn btn-secondary btn-sm">Set Availability</button>
          </div>
        </div>
      </div>

      {/* Appointment History Section */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Appointment History</h3>
        </div>
        <AppointmentList
          // Filter the history to only show completed appointments
          appointments={appointmentHistory.filter(appt => appt.status === 'completed')}
          userType="doctor"
          onComplete={() => {}} // Placeholder - No action needed in history view
          onCancel={() => {}}   // Placeholder
        />
        {/* Removed redundant empty state message - AppointmentList handles this */}
      </div>

      {/* Render Modals */}
      <AvailabilityModal
        isOpen={isAvailabilityModalOpen}
        currentAvailability={doctorAvailability} // Pass fetched/updated availability
        onUpdate={handleUpdateAvailability}
        onClose={handleCloseAvailabilityModal}
      />
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        currentPhone={doctor.phone}
        currentBio={doctor.bio}
        onUpdate={handleUpdateProfile}
        onClose={handleCloseEditProfileModal}
      />
      </div> {/* Close container */}
    </div> // Close profile-page
  );
}

export default DoctorProfilePage;
