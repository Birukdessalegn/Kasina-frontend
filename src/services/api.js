const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // If the browser is accessing on localhost or 127.0.0.1, always prioritize local API
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }
  }
  return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
};

const API_URL = resolveBaseUrl();

const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  // Attach JWT token
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log("API Request:", {
    url: `${API_URL}${endpoint}`,
    method: options.method || "GET",
    hasToken: !!token,
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  console.log("API Response:", response.status, data);

  if (!response.ok) {
    if (response.status === 401) {
      console.warn("Session expired or invalid token. Redirecting to login...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
};

export default api;