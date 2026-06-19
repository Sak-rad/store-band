"use client";

import { useEffect, lazy, Suspense } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { useCurrencyStore } from "../store/currency.store";
import { useAuthModalStore } from "../store/auth-modal.store";
import { api } from "../lib/api";

const AuthModal = lazy(() =>
  import("./AuthModal").then((m) => ({ default: m.AuthModal })),
);

const MobileNav = lazy(() =>
  import("./MobileNav").then((m) => ({ default: m.MobileNav })),
);

interface Props {
  children: React.ReactNode;
  locale: string;
}

function LazyAuthModal() {
  const open = useAuthModalStore((s) => s.open);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <AuthModal />
    </Suspense>
  );
}

function AppInit({ locale }: { locale: string }) {
  const setRate = useCurrencyStore((s) => s.setRate);

  useQuery({
    queryKey: ["currency-rates"],
    queryFn: () =>
      api.get("/currency/rates").then((r) => {
        if (r.data?.RUB) setRate(r.data.RUB);
        return r.data;
      }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    // The RUB-for-ru default is a first-visit convenience only — a persisted
    // user choice must always win. Run it *after* persist has hydrated and read
    // fresh state; otherwise we'd act on the pre-hydration default
    // (userSet=false) and clobber the saved currency on every reload.
    const applyLocaleDefault = () => {
      const { userSet, setDisplayCurrency } = useCurrencyStore.getState();
      if (!userSet && locale === "ru") setDisplayCurrency("RUB");
    };

    if (useCurrencyStore.persist.hasHydrated()) {
      applyLocaleDefault();
      return;
    }
    return useCurrencyStore.persist.onFinishHydration(applyLocaleDefault);
  }, [locale]);

  return null;
}

export function Providers({ children, locale }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit locale={locale} />
      {children}
      <LazyAuthModal />
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </QueryClientProvider>
  );
}
