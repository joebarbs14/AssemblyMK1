import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  // You can add token format or expiry validation here later
  const isAuthenticated = !!token;

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default ProtectedRoute;
