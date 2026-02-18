// Centralized API URL Management
// Production Backend - Railway deployment

// Local development URL (for local development override)
const LOCAL_URL = 'http://localhost:3001';

// Railway production URL
const PRODUCTION_URL = 'https://asli-stud-back-production-7ea4.up.railway.app';

// Use production backend by default
// Override with VITE_API_URL environment variable if needed (e.g., set to LOCAL_URL for local dev)
export const API_BASE_URL = import.meta.env.VITE_API_URL || PRODUCTION_URL;

// Log current configuration (helps with debugging)
const envLabel = API_BASE_URL.includes('localhost') ? 'LOCAL' : 'PRODUCTION';
console.log(`🔌 Backend Mode: ${envLabel}`);
console.log(`📡 API Base URL: ${API_BASE_URL}`);

// Helper function for making API calls with automatic URL handling
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Handle both relative and absolute URLs
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // Get JWT token from localStorage
  const token = localStorage.getItem('authToken');
  
  // Merge headers
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



