// Centralized API URL Management
// Production Backend

// In production (Vercel), use relative URLs to proxy through Vercel
// This avoids mixed content issues (HTTPS frontend → HTTP backend)
// Vercel rewrites /api/* to http://165.232.181.99:3001/api/*
const isProduction = import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));
const isVercel = typeof window !== 'undefined' && (
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('vercel') ||
  window.location.protocol === 'https:'
);

// Local development URL
const LOCAL_URL = 'http://localhost:5000';

// Production URLs
const DIGITAL_OCEAN_URL = 'http://165.232.181.99:3001';

// Use environment variable if set, otherwise determine based on environment
const envUrl = import.meta.env.VITE_API_URL;
const isLocalhostUrl = envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));

let finalUrl: string;

if (envUrl && !isLocalhostUrl) {
  // Use environment variable if provided (and not localhost)
  // But if on Vercel (HTTPS), force relative URL to avoid mixed content
  if (isVercel && envUrl.startsWith('http://')) {
    finalUrl = ''; // Use proxy instead
  } else {
    finalUrl = envUrl;
  }
} else if (isProduction && isVercel) {
  // On Vercel (HTTPS): use relative URL to proxy through Vercel (avoids mixed content)
  finalUrl = '';
} else if (isProduction) {
  // Production but not Vercel: use Digital Ocean URL directly
  finalUrl = DIGITAL_OCEAN_URL;
} else {
  // Local development
  finalUrl = envUrl || LOCAL_URL;
}

export const API_BASE_URL = finalUrl;

// Log current configuration
const getBackendType = (url: string) => {
  if (!url || url === '') return 'VERCEL_PROXY';
  if (url.includes('localhost')) return 'LOCAL';
  if (url.includes('railway')) return 'RAILWAY';
  if (url.includes('165.232.181.99')) return 'DIGITAL_OCEAN';
  return 'PRODUCTION';
};
console.log(`🔌 API Base URL: ${API_BASE_URL || '(relative - proxied through Vercel)'} (${getBackendType(API_BASE_URL)})`);

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
