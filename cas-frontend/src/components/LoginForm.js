import { useState } from 'react';

function LoginForm({ onLogin }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    userType: 'patient'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(credentials);
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Email</label>
        <input
          className="form-control" // Added class
          type="email"
          name="email"
          value={credentials.email}
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
          value={credentials.password}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Login as</label>
        <div className="user-type-toggle">
          <button
            type="button"
            className={`toggle-option ${credentials.userType === 'patient' ? 'active' : ''}`}
            onClick={() => setCredentials({...credentials, userType: 'patient'})}
          >
            Patient
          </button>
          <button
            type="button"
            className={`toggle-option ${credentials.userType === 'doctor' ? 'active' : ''}`}
            onClick={() => setCredentials({...credentials, userType: 'doctor'})}
          >
            Doctor
          </button>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-block"> {/* Added btn-primary and btn-block */}
        Login
      </button>
    </form>
  );
}

export default LoginForm;
