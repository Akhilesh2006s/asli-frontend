// Centralized API URL Management
// Production Backend - Railway deployment

// Railway production URL
const RAILWAY_URL = 'https://asli-stud-back-production.up.railway.app';

// Always use Railway URL - no localhost fallback
// Override with VITE_API_URL environment variable if needed
export const API_BASE_URL = import.meta.env.VITE_API_URL || RAILWAY_URL;

// Log current configuration (helps with debugging)
console.log(`🔌 Backend Mode: RAILWAY`);
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



