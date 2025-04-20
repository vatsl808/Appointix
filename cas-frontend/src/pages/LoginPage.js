import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import '../styles/login.css';
import loginIllustration from '../assets/login_image.png'; // Removed unused import

function LoginPage({ setIsAuthenticated }) { // Add setIsAuthenticated prop
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (credentials) => {
    setError(''); // Clear previous errors
    try {
      // Call the backend login API
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send email, password, and userType (though backend currently only uses email/password for lookup)
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle login errors (e.g., invalid credentials)
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Login successful - Store token and user type from response
      console.log('Login successful:', result.message);
      localStorage.setItem('token', result.token);
      localStorage.setItem('userType', result.userType);
      // Store doctorId if it exists in the response
      if (result.doctorId) {
        localStorage.setItem('doctorId', result.doctorId);
      } else {
        // Ensure any previous doctorId is cleared if logging in as patient
        localStorage.removeItem('doctorId');
      }
      setIsAuthenticated(true); // Update auth state in App.js

      // Redirect based on user type from backend response
      navigate(result.userType === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');

    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-container">
        {/* Left Side - Illustration/Branding */}
        <div className="auth-visual">
          {/* Image will now fill this container */}
          <img src={loginIllustration} alt="Login Illustration" />
          {/* Removed the visual-content div */}
        </div>

        {/* Right Side - Form */}
        <div className="auth-form-container">
          <div className="form-wrapper">
            <h2>Welcome Back</h2>
            <p className="subtitle">Login to access your dashboard.</p>
            {error && <div className="alert alert-danger">{error}</div>}
            <LoginForm onLogin={handleLogin} />
            <p className="auth-switch-link">
              Don't have an account? <a href="/register">Register here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
