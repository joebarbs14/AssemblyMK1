import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  // ✅ Basic auth check
  const isAuthenticated = !!token;

  // 🔒 Optional enhancement for token expiry (future-proof):
  // try {
  //   const [, payload] = token.split('.');
  //   const decoded = JSON.parse(atob(payload));
  //   const isExpired = decoded.exp * 1000 < Date.now();
  //   if (isExpired) return <Navigate to="/" replace />;
  // } catch (e) {
  //   return <Navigate to="/" replace />;
  // }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default ProtectedRoute;
