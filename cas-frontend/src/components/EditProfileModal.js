import React, { useState, useEffect } from 'react';
import '../styles/modal.css'; // Use existing modal styles

function EditProfileModal({ isOpen, currentPhone, currentBio, onUpdate, onClose }) {
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  // Update local state when the modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      setPhone(currentPhone || '');
      setBio(currentBio || '');
    }
  }, [isOpen, currentPhone, currentBio]);

  const [error, setError] = useState(''); // Add error state

  const handleSubmit = async (e) => { // Make async
    e.preventDefault();
    setError(''); // Clear previous error

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication error. Please log in again.");
      return;
    }

    const updatePayload = { phone, bio };

    try {
      const response = await fetch('http://localhost:5001/api/doctors/me/profile', {
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

      // Call parent's onUpdate handler ONLY on successful API call
      onUpdate(updatePayload); // Pass the updated data back
      // Removed duplicate call
      // alert(result.message || "Profile updated successfully!"); // Parent alert is sufficient

    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile.");
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="modal-container"> {/* Can reuse general modal container */}
        <div className="modal-header">
          <h2>Edit Profile Details</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="alert alert-danger">{error}</p>} {/* Display error */}
            <div className="form-group">
              <label htmlFor="edit-profile-phone">Phone:</label>
              <input
                type="tel"
                id="edit-profile-phone"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-profile-bio">Bio:</label>
              <textarea
                id="edit-profile-bio"
                className="form-control"
                rows="5"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Enter a short bio"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Save Profile Changes
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

export default EditProfileModal;
