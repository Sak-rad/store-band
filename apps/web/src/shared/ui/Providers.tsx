'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { useCurrencyStore } from '../store/currency.store';
import { useAuthStore } from '../store/auth.store';
import { api } from '../lib/api';

interface Props {
  children: React.ReactNode;
  locale: string;
}

export function Providers({ children, locale }: Props) {
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  const setRate = useCurrencyStore((s) => s.setRate);
  const userSet = useCurrencyStore((s) => s.userSet);
  const { user, accessToken, setUser, setToken, logout } = useAuthStore();

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

  // On every app load: if user is persisted but accessToken is gone (page reload),
  // restore session via refresh cookie, then verify identity.
  useEffect(() => {
    if (!user) return;

    const restore = async () => {
      try {
        let token = accessToken;
        if (!token) {
          // accessToken lives in memory — lost on reload, restore via httpOnly cookie
          const { data } = await api.post('/auth/refresh');
          token = data.accessToken;
          setToken(token);
          if (data.user) setUser(data.user);
        } else {
          // Token already in memory — just sync user data
          const { data } = await api.get('/users/me');
          setUser(data);
        }
      } catch {
        logout();
      }
    };

    restore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
