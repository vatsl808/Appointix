import { useState } from 'react';

function RegisterForm({ onRegister }) {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'patient',
    specialization: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister(userData);
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Full Name</label>
        <input
          className="form-control" // Added class
          type="text"
          name="name"
          value={userData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input
          className="form-control" // Added class
          type="email"
          name="email"
          value={userData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input
          className="form-control" // Added class
          type="password"
          name="password"
          value={userData.password}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Account Type</label>
        <select
          className="form-control" // Added class
          name="userType"
          value={userData.userType}
          onChange={handleChange}
          required
        >
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
        </select>
      </div>
      {userData.userType === 'doctor' && (
        <div className="form-group specialization-group"> {/* Added class for specific styling */}
          <label>Specialization</label>
          <input
            className="form-control" // Added class
            type="text"
            name="specialization"
            value={userData.specialization}
            onChange={handleChange}
            required={userData.userType === 'doctor'}
          />
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-block"> {/* Added btn-primary and btn-block */}
        Register
      </button>
    </form>
  );
}

export default RegisterForm;
