import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // ✅ Token expiry validation (optional but recommended)
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    const isExpired = decoded.exp * 1000 < Date.now(); // expiration is in seconds

    if (isExpired) {
      localStorage.removeItem('token'); // clean up expired token
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    console.error('Error decoding token:', e);
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
