// Centralized API configuration for production and development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const getApiUrl = (path) => {
  // Normalize path and strip legacy '/api' prefix if present
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.replace("/api/", "/");
  } else if (cleanPath === "/api") {
    cleanPath = "/";
  }
  
  // Ensure we don't have double slashes if API_BASE_URL ends with one
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Enhanced fetch wrapper that automatically handles:
 * 1. Base URL prepending
 * 2. Authorization Bearer token injection from localStorage
 * 3. Default Content-Type headers
 */
export const apiFetch = async (path, options = {}) => {
  const url = getApiUrl(path);
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  // We no longer strictly need credentials: 'include' for Bearer auth,
  // but we can keep it for cross-site cookie fallback/parity if needed.
  if (fetchOptions.credentials === undefined) {
    fetchOptions.credentials = 'include';
  }

  return fetch(url, fetchOptions);
};

export default API_BASE_URL;
