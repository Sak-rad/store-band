import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DisplayCurrency = 'USD' | 'RUB';

interface CurrencyState {
  displayCurrency: DisplayCurrency;
  usdToRub: number;
  userSet: boolean; // true once user explicitly toggles
  setDisplayCurrency: (c: DisplayCurrency) => void;
  setRate: (rate: number) => void;
  toggle: () => void;
  formatPrice: (usdAmount: number | string) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      displayCurrency: 'USD',
      usdToRub: 90,
      userSet: false,

      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
      setRate: (usdToRub) => set({ usdToRub }),
      toggle: () =>
        set((s) => ({
          displayCurrency: s.displayCurrency === 'USD' ? 'RUB' : 'USD',
          userSet: true,
        })),

      formatPrice: (usdAmount) => {
        const { displayCurrency, usdToRub } = get();
        const num = Number(usdAmount);
        if (isNaN(num)) return '—';
        if (displayCurrency === 'RUB') {
          return `${Math.round(num * usdToRub).toLocaleString('ru-RU')} ₽`;
        }
        return `$${num.toLocaleString('en-US')}`;
      },
    }),
    { name: 'currency-v1' },
  ),
);
