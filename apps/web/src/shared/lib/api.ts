import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const locale = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] || 'en';
    config.headers['Accept-Language'] = locale;

    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await api.post('/auth/refresh');
        return api.request(error.config);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
