// Centralized API URL Management
// Production Backend - Railway deployment

// Railway production URL
const RAILWAY_URL = 'https://asli-stud-back-production.up.railway.app';

// Check if we should use localhost (only if explicitly set)
const USE_LOCALHOST = import.meta.env.VITE_USE_LOCALHOST === 'true';
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Backend URL - use Railway by default, localhost only if explicitly enabled
const LOCAL_URL = 'http://localhost:3001'; // Change this if your local backend runs on different port

// Use Railway URL by default, localhost only if VITE_USE_LOCALHOST is set to 'true'
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
                            (USE_LOCALHOST && isLocalhost ? LOCAL_URL : RAILWAY_URL);

// Log current configuration (helps with debugging)
const mode = USE_LOCALHOST && isLocalhost ? 'LOCAL' : 'RAILWAY';
console.log(`🔌 Backend Mode: ${mode}`);
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



