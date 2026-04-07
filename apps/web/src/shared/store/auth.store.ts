import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
  preferredLocale: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isRestoring: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setRestoring: (v: boolean) => void;
  logout: () => void;
}

// user persisted for instant UI render — re-validated from API on mount (Providers.tsx)
// accessToken is memory-only: never written to localStorage (XSS risk)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isRestoring: true,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ accessToken: token }),
      setRestoring: (v) => set({ isRestoring: v }),
      logout: () => set({ user: null, accessToken: null, isRestoring: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
