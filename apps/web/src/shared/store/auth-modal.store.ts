import { create } from 'zustand';

type Tab = 'login' | 'register';

interface AuthModalStore {
  open: boolean;
  tab: Tab;
  openLogin: () => void;
  openRegister: () => void;
  setTab: (tab: Tab) => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  open: false,
  tab: 'login',
  openLogin: () => set({ open: true, tab: 'login' }),
  openRegister: () => set({ open: true, tab: 'register' }),
  setTab: (tab) => set({ tab }),
  close: () => set({ open: false }),
}));
