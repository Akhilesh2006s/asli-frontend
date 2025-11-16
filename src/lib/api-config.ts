// Centralized API URL Management
// Production Backend - Railway deployment

// Railway production URL
const RAILWAY_URL = 'https://asli-stud-back-production.up.railway.app';

// Always use Railway URL - no localhost fallback
// Override with VITE_API_URL environment variable if needed
export const API_BASE_URL = import.meta.env.VITE_API_URL || RAILWAY_URL;

// Log current configuration
console.log(`🔌 API Base URL: ${API_BASE_URL} (RAILWAY)`);

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
