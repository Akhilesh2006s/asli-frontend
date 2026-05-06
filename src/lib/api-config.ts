// API config
// - Development: use local/non-SSL backend if needed
// - Production: MUST use HTTPS API endpoint (no mixed content)

const DEV_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PROD_URL = import.meta.env.VITE_API_URL_PROD || "https://api.aslilearn.ai";

export const API_BASE_URL =
  import.meta.env.MODE === "production" ? PROD_URL : DEV_URL;

/** PDFs on our hosts can load in an iframe without the student proxy. */
export function isOurBackendPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return (
      host.includes("aslilearn.ai") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return true;
  }
}

/** Domains known to block datacenter IPs — serve directly to browser */
const DIRECT_FETCH_DOMAINS = [
  "ncert.nic.in",
  "ncertbooks.prashanthellina.com",
];

export function shouldFetchDirectly(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return DIRECT_FETCH_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

/**
 * `src` for student PDF iframes. External URLs use `/content-preview` with `token` in the query
 * because the browser cannot send `Authorization` on iframe navigations.
 */
export function getStudentPdfPreviewIframeSrc(
  fileUrl: string,
  title?: string
): string {
  if (!fileUrl) return "";

  // Our own backend URLs — load directly, no proxy needed
  if (isOurBackendPdfUrl(fileUrl)) {
    return fileUrl;
  }

  // External domains that block datacenter IPs — bypass proxy, let browser fetch directly
  if (shouldFetchDirectly(fileUrl)) {
    return fileUrl;
  }

  // All other external URLs — route through our backend proxy
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") || ""
      : "";
  return (
    `${API_BASE_URL}/api/student/content-preview` +
    `?url=${encodeURIComponent(fileUrl)}` +
    `&filename=${encodeURIComponent(title || "preview.pdf")}` +
    `&token=${encodeURIComponent(token)}`
  );
}

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

