// API config
// - Development: talk to local backend (update port if your local backend is different)
// - Production: use HTTPS domain fronted by Nginx + Let's Encrypt

const DEV_URL = "http://localhost:5000";
const PROD_URL = "https://api.aslilearn.ai";

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

