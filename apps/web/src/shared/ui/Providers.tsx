'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { useCurrencyStore } from '../store/currency.store';
import { api } from '../lib/api';

interface Props {
  children: React.ReactNode;
  locale: string;
}

export function Providers({ children, locale }: Props) {
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  const setRate = useCurrencyStore((s) => s.setRate);
  const userSet = useCurrencyStore((s) => s.userSet);

  useEffect(() => {
    // Default to RUB for Russian locale (only if user hasn't changed it manually)
    if (!userSet && locale === 'ru') {
      setDisplayCurrency('RUB');
    }
    // Fetch real-time exchange rate
    api.get('/currency/rates').then((r) => {
      if (r.data?.RUB) setRate(r.data.RUB);
    }).catch(() => {});
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
