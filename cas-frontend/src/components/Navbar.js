import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaCalendarAlt,
  FaUserMd,
  FaStethoscope // Re-add FaStethoscope
} from 'react-icons/fa';
// No longer need jwt-decode here
import '../styles/navbar.css';

function Navbar({ isAuthenticated }) {
  const userType = localStorage.getItem('userType');
  // Get doctorId directly from localStorage if user is a doctor
  const doctorId = userType === 'doctor' ? localStorage.getItem('doctorId') : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <FaStethoscope className="icon" /> Appointix {/* Restore icon */}
        </Link>
        
        <div className="navbar-links">
          {/* Links for Logged Out Users */}
          {!isAuthenticated && (
            <>
              <Link to="/login" className="nav-link">
                <FaSignInAlt className="icon" /> Login
              </Link>
              <Link to="/register" className="nav-link">
                <FaUserPlus className="icon" /> Register
              </Link>
            </>
          )}

          {/* Links for Logged In Users */}
          {isAuthenticated && (
            <>
              {/* Patient Links */}
              {userType === 'patient' && (
                <>
                  <Link to="/doctors" className="nav-link">
                    <FaUserMd className="icon" /> Doctors
                  </Link>
                  <Link to="/patient-dashboard" className="nav-link">
                    <FaCalendarAlt className="icon" /> Dashboard
                  </Link>
                </>
              )}

              {/* Doctor Links */}
              {userType === 'doctor' && (
                <>
                  <Link to="/doctor-dashboard" className="nav-link">
                     <FaCalendarAlt className="icon" /> Appointments {/* Added Icon */}
                  </Link>
                  {/* Add other doctor-specific links here if needed */}
                </>
              )}

              {/* Profile Dropdown (Common for logged-in users) */}
              {/* Remove onMouseEnter/Leave, rely on CSS :hover */}
              <div className="profile-dropdown">
                <button
                  className="profile-btn"
                  // Remove onClick toggle if purely hover-based
                >
                  <FaUser className="icon" />
                </button>

                {/* Dropdown menu is always in the DOM, visibility controlled by CSS */}
                <div className="dropdown-menu">
                    {/* Conditionally render profile link using doctorId from localStorage */}
                    {userType === 'doctor' && doctorId ? (
                      <Link to={`/doctor/${doctorId}`} className="dropdown-item">
                        View Profile
                      </Link>
                    ) : userType === 'patient' ? (
                      // Optional: Link to a future patient profile page
                      // <Link to="/patient-profile" className="dropdown-item">View Profile</Link>
                      null // Or hide for patients for now
                    ) : null}
                    <button
                      onClick={handleLogout}
                      className="dropdown-item logout-btn"
                    >
                      Logout
                    </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
