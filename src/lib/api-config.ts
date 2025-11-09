// Centralized API URL Management
// Production Backend - Railway deployment

// Railway production URL
const RAILWAY_URL = 'https://asli-stud-back-production.up.railway.app';

// Check if we should use localhost (only if explicitly set or in strict dev mode)
const USE_LOCALHOST = import.meta.env.VITE_USE_LOCALHOST === 'true';
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Backend URL - use Railway by default, localhost only if explicitly enabled
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || '5000';
const LOCAL_URL = `http://localhost:${BACKEND_PORT}`;

// Use Railway URL by default, localhost only if VITE_USE_LOCALHOST is set to 'true'
// This allows Railway to be used everywhere unless explicitly overridden
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
                            (USE_LOCALHOST && isLocalhost ? LOCAL_URL : RAILWAY_URL);

// Log current configuration
console.log(`🔌 API Base URL: ${API_BASE_URL} (${USE_LOCALHOST && isLocalhost ? 'LOCAL' : 'RAILWAY'})`);

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
