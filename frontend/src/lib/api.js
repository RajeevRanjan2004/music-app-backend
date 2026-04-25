import { Capacitor } from "@capacitor/core";

const WEB_API_BASE_URL = "http://localhost:5000/api";
const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:5000/api";
const platform = Capacitor.getPlatform();

const API_BASE_URL =
  platform === "android"
    ? import.meta.env.VITE_ANDROID_API_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      ANDROID_EMULATOR_API_BASE_URL
    : import.meta.env.VITE_API_BASE_URL || WEB_API_BASE_URL;
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

const NETWORK_ERROR_MESSAGE =
  platform === "android"
    ? `Network error. Start the backend and set VITE_ANDROID_API_BASE_URL if needed (emulator: ${ANDROID_EMULATOR_API_BASE_URL}, real device: use your computer's LAN IP).`
    : `Network error. Make sure the backend server is running on ${WEB_API_BASE_URL}`;

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || `HTTP Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }
    throw error;
  }
}

function resolveApiAssetUrl(value) {
  const asset = String(value || "").trim();

  if (!asset) {
    return "";
  }

  if (asset.startsWith("blob:") || asset.startsWith("data:")) {
    return asset;
  }

  try {
    const parsed = new URL(asset);
    if (parsed.pathname.startsWith("/uploads/") && API_ORIGIN) {
      return `${API_ORIGIN}${parsed.pathname}`;
    }
    return asset;
  } catch {
    if (asset.startsWith("/") && API_ORIGIN) {
      return `${API_ORIGIN}${asset}`;
    }

    return asset;
  }
}

export { API_BASE_URL, apiRequest, resolveApiAssetUrl };
