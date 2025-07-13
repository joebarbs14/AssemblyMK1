import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const login = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred. Please try again.');
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

      <button onClick={login}>Login</button>

      <p className="signup-redirect">
        Don’t have an account?{' '}
        <span className="link" onClick={() => navigate('/signup')}>Sign up</span>
      </p>
    </div>
  );
}

export default LoginPage;
