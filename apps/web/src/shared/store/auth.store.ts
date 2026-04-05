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
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

// user persisted for instant UI render — re-validated from API on mount (Providers.tsx)
// accessToken is memory-only: never written to localStorage (XSS risk)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-storage',
      // only persist user info, never the token
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
