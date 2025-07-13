// src/utils/auth.js
import jwtDecode from 'jwt-decode';

export function getToken() {
  return localStorage.getItem('token');
}

export function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded.id;
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}
