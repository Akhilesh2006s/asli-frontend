// Centralized API URL Management
// Railway Production Backend

// Railway production URL
const RAILWAY_URL = 'https://asli-stud-back-production.up.railway.app';

// Local development URL (for reference)
const LOCAL_URL = 'http://localhost:5000';

// Use Railway URL by default, override with VITE_API_URL environment variable if needed
// To switch to local backend, set VITE_API_URL=http://localhost:5000 in .env file
export const API_BASE_URL = import.meta.env.VITE_API_URL || RAILWAY_URL;

// Log current configuration
console.log(`🔌 API Base URL: ${API_BASE_URL} (${API_BASE_URL.includes('localhost') ? 'LOCAL' : 'RAILWAY'})`);

// Helper function for making API calls
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {}),
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
};

export default API_BASE_URL;
