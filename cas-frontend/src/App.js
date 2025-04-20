import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './styles/main.css';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorListPage from './pages/DoctorListPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorProfilePage from './pages/DoctorProfilePage';
import AccessDeniedPage from './pages/AccessDeniedPage'; // Import the Access Denied page

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Update auth state when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <Router>
      <div className="app">
        <Navbar isAuthenticated={isAuthenticated} />
        <Routes>
          <Route 
            path="/login" 
            element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} 
          />
          <Route 
            path="/register" 
            element={<RegisterPage setIsAuthenticated={setIsAuthenticated} />} 
          />
          <Route path="/doctors" element={<DoctorListPage />} />
          <Route path="/book/:doctorId" element={<BookAppointmentPage />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/:id" element={<DoctorProfilePage />} /> {/* Add doctor profile route */}
          {/* Consider changing the default route later if needed */}
          <Route path="/" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} /> {/* Add route for Access Denied */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
