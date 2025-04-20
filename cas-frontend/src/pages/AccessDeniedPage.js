import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa'; // Using an icon
import '../styles/access-denied.css'; // We will create this next
import '../styles/main.css'; // Import main styles for variables and layout

function AccessDeniedPage() {
  // Determine the correct home path based on login status and user type
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  let homePath = '/'; // Default to login page
  let buttonText = 'Go to Login';

  if (token) {
    if (userType === 'patient') {
      homePath = '/patient-dashboard';
      buttonText = 'Go to My Dashboard';
    } else if (userType === 'doctor') {
      homePath = '/doctor-dashboard';
      buttonText = 'Go to My Dashboard';
    }
    // If token exists but type is unknown/null, default link remains '/' but text changes
    else {
       buttonText = 'Go to Homepage'; // Or keep 'Go to Login'
    }
  }
  return (
    <div className="access-denied-page page-container">
      <div className="container access-denied-container">
        <FaExclamationTriangle className="access-denied-icon" />
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <p>
          If you believe this is an error, please contact support or try logging in again.
        </p>
        <Link to={homePath} className="btn btn-primary">{buttonText}</Link>
      </div>
    </div>
  );
}

export default AccessDeniedPage;