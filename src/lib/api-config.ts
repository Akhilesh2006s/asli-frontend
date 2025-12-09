// Centralized API URL Management
// Production Backend

// Production server URL (using HTTPS for Vercel deployment)
// Point to the public API domain (served via Nginx proxy on the droplet)
const PRODUCTION_URL = 'https://api.aslilearn.ai';

// Local development URL (for reference)
const LOCAL_URL = 'http://localhost:5000';

// Use production URL by default
// VITE_API_URL environment variable can override this
// However, in production (Vercel):
// - Ignore localhost URLs (will cause connection errors)
// - Force HTTP URLs to HTTPS (to prevent mixed content errors)
const envUrl = import.meta.env.VITE_API_URL;
// Check if we're running on localhost (development)
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);
const isProduction = import.meta.env.PROD && !isLocalhost;
const isLocalhostUrl = envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));
const isHttpUrl = envUrl && envUrl.startsWith('http://') && !envUrl.includes('localhost');

const allowHttpApi = import.meta.env.VITE_ALLOW_HTTP === 'true';

const isIpAddress = (url?: string) => {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
};

// In production: ignore localhost, optionally convert HTTP to HTTPS, otherwise use envUrl or default
// In development: use LOCAL_URL if envUrl is not set
let finalUrl: string;
if (isProduction) {
  // Production mode
  if (envUrl) {
    if (isLocalhostUrl) {
      finalUrl = PRODUCTION_URL; // Ignore localhost in production
    } else if (isHttpUrl && !allowHttpApi && !isIpAddress(envUrl)) {
      finalUrl = envUrl.replace('http://', 'https://'); // Force HTTPS for domains
    } else {
      finalUrl = envUrl; // Respect explicit env URL (e.g., droplet IP over HTTP)
    }
  } else {
    finalUrl = PRODUCTION_URL; // Default to production
  }
} else {
  // Development mode - prioritize localhost
  if (isLocalhost) {
    // If running on localhost, use local backend unless explicitly overridden
    finalUrl = envUrl && !isLocalhostUrl ? envUrl : LOCAL_URL;
  } else {
    // Not localhost but in dev mode - use env URL or local URL
    finalUrl = envUrl || LOCAL_URL;
  }
}

export const API_BASE_URL = finalUrl;

// Log current configuration
const envLabel = API_BASE_URL.includes('localhost')
  ? 'LOCAL'
  : isIpAddress(API_BASE_URL)
    ? 'DIRECT_IP'
    : 'PRODUCTION';
console.log(`🔌 API Base URL: ${API_BASE_URL} (${envLabel})`);
console.log(`🔍 Environment: isProduction=${isProduction}, isLocalhost=${isLocalhost}, envUrl=${envUrl || 'not set'}`);

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
