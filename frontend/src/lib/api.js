import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = "sb.token.v1";

export const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function apiError(e, fallback = "Something went wrong. Please try again.") {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || JSON.stringify(d)).join(" ");
  if (detail?.msg) return detail.msg;
  return e?.message || fallback;
}
