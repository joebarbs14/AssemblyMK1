import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const register = async () => {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registration successful! You can now log in.");
      navigate('/');
    } else {
      alert(data.message || 'Registration failed');
    }
  };

  return (
    <div className="login-container">
      <h1>Sign Up</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full Name"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={register}>Create Account</button>
      <p style={{ marginTop: '1rem' }}>
        Already have an account?{' '}
        <span className="link" onClick={() => navigate('/')}>Log in</span>
      </p>
    </div>
  );
}

export default SignupPage;
