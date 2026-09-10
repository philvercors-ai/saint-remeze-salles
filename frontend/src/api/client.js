/**
 * Instance Axios avec intercepteurs JWT (auto-refresh sur 401).
 */
import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // envoie/reçoit le cookie httpOnly refresh_token
});

// ── Inject access token ─────────────────────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ─────────────────────────────────────────────────────
let isRefreshing = false;
let pendingRequests = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Le refresh token voyage dans le cookie httpOnly, pas ici — on ne
        // sait pas côté JS s'il existe, on laisse simplement l'appel échouer
        // proprement (401) si le cookie est absent ou expiré.
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, {}, { withCredentials: true });
        const newAccess = data.access;
        useAuthStore.getState().setAccessToken(newAccess);

        pendingRequests.forEach(({ resolve }) => resolve(newAccess));
        pendingRequests = [];

        original.headers.Authorization = `Bearer ${newAccess}`;
        return client(original);
      } catch (refreshError) {
        pendingRequests.forEach(({ reject }) => reject(refreshError));
        pendingRequests = [];
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
