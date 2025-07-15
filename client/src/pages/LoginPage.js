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

        // Decode the JWT and store name
        const base64 = data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        if (decoded.name) {
          localStorage.setItem('userName', decoded.name);
        }

        navigate('/dashboard'); // ✅ Route works in HashRouter
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
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="username"
        required
      />

      <input
        type="password"
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
