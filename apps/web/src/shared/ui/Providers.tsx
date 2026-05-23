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
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  const setRate = useCurrencyStore((s) => s.setRate);
  const userSet = useCurrencyStore((s) => s.userSet);

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
    if (!userSet && locale === "ru") {
      setDisplayCurrency("RUB");
    }
  }, [locale, userSet, setDisplayCurrency]);

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
