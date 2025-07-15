import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children /*, roles = [] */ }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    // Redirect to login with return path
    return <Navigate to={`/?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    const isExpired = decoded.exp * 1000 < Date.now();

    if (isExpired) {
      console.warn('Token expired');
      localStorage.removeItem('token');
      return <Navigate to={`/?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }

    // ✅ Optional role-based access
    /*
    if (roles.length && !roles.includes(decoded.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
    */

    return children;
  } catch (err) {
    console.error('Invalid token format:', err);
    localStorage.removeItem('token');
    return <Navigate to={`/?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
}

export default ProtectedRoute;
