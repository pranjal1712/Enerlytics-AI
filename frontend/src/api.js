// Centralized API configuration for production and development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getApiUrl = (path) => {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default API_BASE_URL;
