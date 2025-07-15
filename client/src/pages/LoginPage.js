import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('token');
    // Also remove userName if it was stored from previous attempts
    localStorage.removeItem('userName');
  }, []);

  const login = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('https://assemblymk1-backend.onrender.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get('content-type');
      const data = contentType?.includes('application/json') ? await res.json() : {};

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        console.log('LoginPage: Token successfully stored in localStorage:', localStorage.getItem('token'));

        // --- REMOVED JWT DECODING FOR USER NAME ---
        // The userName will now be fetched by DashboardPage from the /user/profile endpoint
        // This avoids the "Decoded token missing 'name' field" warning as 'name' is not in 'sub'
        // --- END REMOVED ---

        // ✅ Redirect to original page or default to dashboard
        const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        navigate(redirectTo);
      } else {
        console.error('Login failed:', data);
        alert(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>LocalGov Login</h1>

      <input
        type="email"
        id="loginEmail" // Added id
        name="email"    // Added name
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="username"
        required
      />

      <input
        type="password"
        id="loginPassword" // Added id
        name="password"    // Added name
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        required
      />

      <button onClick={login} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <p className="signup-redirect">
        Don’t have an account?{' '}
        <span className="link" onClick={() => navigate('/signup')}>Sign up</span>
      </p>
    </div>
  );
}

export default LoginPage;
