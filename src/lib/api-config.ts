// API config
// - Development: use local/non-SSL backend if needed
// - Production: MUST use HTTPS API endpoint (no mixed content)

const DEV_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PROD_URL = import.meta.env.VITE_API_URL_PROD || "https://api.aslilearn.ai";

export const API_BASE_URL =
  import.meta.env.MODE === "production" ? PROD_URL : DEV_URL;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const token = localStorage.getItem("authToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
};

export default API_BASE_URL;

