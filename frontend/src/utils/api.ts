// API configuration
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000";

export const API_BASE = `${API_URL}/api`;
export const WS_BASE = WS_URL;

// Function to create headers with auth token
export const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

// Default fetch options with CORS settings
export const getDefaultFetchOptions = (
  method: string = "GET",
  token?: string,
  includeCredentials: boolean = true
): RequestInit => {
  return {
    method,
    headers: getAuthHeaders(token),
    credentials: includeCredentials
      ? "include"
      : ("omit" as RequestCredentials),
    mode: "cors" as RequestMode,
  };
};

// Helper function to fetch debug token for development
export const fetchDebugToken = async () => {
  // Only for development - do not use in production
  try {
    // First try with the direct token endpoint
    try {
      const response = await fetch(`${API_URL}/api/debug-direct/token`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        mode: "cors",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
          console.log("Debug token saved to localStorage");
          return data.access_token;
        }
      }
    } catch (directError) {
      console.error("Error fetching direct debug token:", directError);
    }

    // Fallback to the API router endpoint
    const response = await fetch(`${API_BASE}/debug/token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch debug token");
    }

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      console.log("Debug token saved to localStorage");
      return data.access_token;
    }
  } catch (error) {
    console.error("Error fetching debug token:", error);
  }
  return null;
};

// Generic API fetch function with proper CORS handling
export const apiFetch = async <T>(
  endpoint: string,
  method: string = "GET",
  body?: any,
  token?: string,
  includeCredentials: boolean = true
): Promise<T> => {
  const options: RequestInit = getDefaultFetchOptions(
    method,
    token,
    includeCredentials
  );

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `API request failed with status ${response.status}`
    );
  }

  return response.json();
};
