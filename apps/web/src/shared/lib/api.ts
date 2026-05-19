import axios from "axios";
import { useAuthStore } from "../store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const SUPPORTED_LOCALES = ["en", "ru"];
    const raw = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];
    const locale = raw && SUPPORTED_LOCALES.includes(raw) ? raw : "en";
    config.headers["Accept-Language"] = locale;

    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers["Authorization"] = `Bearer ${token}`;
          resolve(api.request(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await api.post("/auth/refresh");
      const newToken: string = data.accessToken;

      useAuthStore.getState().setToken(newToken);
      if (data.user) useAuthStore.getState().setUser(data.user);

      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];

      original.headers["Authorization"] = `Bearer ${newToken}`;
      return api.request(original);
    } catch {
      useAuthStore.getState().logout();
      refreshQueue = [];
      if (typeof window !== "undefined") {
        const localeMatch = window.location.pathname.match(/^\/(en|ru)/);
        const locale = localeMatch ? localeMatch[1] : "en";
        window.location.href = `/${locale}/login`;
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
