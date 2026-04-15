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

export default API_BASE_URL;
