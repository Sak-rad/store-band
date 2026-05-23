import axios from "axios";
import { useAuthStore } from "../store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends httpOnly cookies automatically
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
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

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
      return new Promise<void>((resolve) => {
        refreshQueue.push(() => resolve(api.request(original)));
      });
    }

    isRefreshing = true;

    try {
      await api.post("/auth/refresh");
      // New access_token cookie is set by server — just retry
      refreshQueue.forEach((cb) => cb());
      refreshQueue = [];
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
