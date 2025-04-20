import React, { useState } from 'react'; // Ensure React is imported
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import '../styles/main.css'; // Use shared auth styles from main.css
import signupIllustration from '../assets/signup_image.png'; // Import the signup image

// Pass setIsAuthenticated if registration should also log the user in
function RegisterPage({ setIsAuthenticated }) {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (userData) => {
    try {
      setError(''); // Clear previous errors

      // Call the backend API
      const response = await fetch('http://localhost:5001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle errors from the backend (e.g., email already exists)
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Registration successful (Backend currently doesn't return a token on register)
      // For now, redirect to login page after successful registration
      console.log('Registration successful:', result.message);
      alert('Registration successful! Please log in.'); // Give user feedback
      navigate('/login');

      // --- OLD MOCK LOGIN LOGIC (Remove/Comment out) ---
      // localStorage.setItem('token', 'mock-token');
      // localStorage.setItem('userType', userData.userType);
      // if (setIsAuthenticated) {
      //     setIsAuthenticated(true);
      // }
      // navigate(userData.userType === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
      // --- END OLD MOCK ---

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || 'Registration failed. Please check your details and try again.');
    }
  };

  return (
    // Use the same structure as LoginPage for consistency
    <div className="auth-page register-page">
      <div className="auth-container">
        {/* Left Side - Visual/Branding */}
        <div className="auth-visual">
           {/* Display the signup illustration */}
           <img src={signupIllustration} alt="Signup Illustration" />
           {/* Removed the visual-content div */}
        </div>

        {/* Right Side - Form */}
        <div className="auth-form-container">
          <div className="form-wrapper">
            <h2>Sign Up</h2>
            <p className="subtitle">Enter your details to create an account.</p>
            {error && <div className="alert alert-danger">{error}</div>}
            <RegisterForm onRegister={handleRegister} />
            <p className="auth-switch-link">
              Already have an account? <a href="/login">Login here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
