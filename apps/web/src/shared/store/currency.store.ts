import { create } from "zustand";
import { persist } from "zustand/middleware";

type DisplayCurrency = "USD" | "RUB";

interface CurrencyState {
  displayCurrency: DisplayCurrency;
  usdToRub: number;
  userSet: boolean; // true once user explicitly toggles
  setDisplayCurrency: (c: DisplayCurrency) => void;
  setRate: (rate: number) => void;
  toggle: () => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      displayCurrency: "USD",
      usdToRub: 90,
      userSet: false,

      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
      setRate: (usdToRub) => set({ usdToRub }),
      toggle: () =>
        set((s) => ({
          displayCurrency: s.displayCurrency === "USD" ? "RUB" : "USD",
          userSet: true,
        })),
    }),
    { name: "currency-v1" },
  ),
);

const format = (
  usdAmount: number | string,
  displayCurrency: DisplayCurrency,
  usdToRub: number,
): string => {
  const num = Number(usdAmount);
  if (isNaN(num)) return "—";
  if (displayCurrency === "RUB") {
    return `${Math.round(num * usdToRub).toLocaleString("ru-RU")} ₽`;
  }
  return `$${num.toLocaleString("en-US")}`;
};

// Reactive formatter: subscribes to currency + rate so consuming components
// re-render the moment the user toggles currency. (A store method reading
// get() is a stable reference and would NOT trigger a re-render.)
export function useFormatPrice() {
  const displayCurrency = useCurrencyStore((s) => s.displayCurrency);
  const usdToRub = useCurrencyStore((s) => s.usdToRub);
  return (usdAmount: number | string) => format(usdAmount, displayCurrency, usdToRub);
}
