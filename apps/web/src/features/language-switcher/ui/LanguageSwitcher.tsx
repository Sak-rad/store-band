'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../../navigation';
import { useTransition } from 'react';
import { api } from '../../../shared/lib/api';
import { useAuthStore } from '../../../shared/store/auth.store';
import styles from './LanguageSwitcher.module.scss';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const user = useAuthStore((s) => s.user);

  const switchLocale = async (newLocale: 'en' | 'ru') => {
    // Persist to user profile if logged in
    if (user) {
      try {
        await api.patch('/users/me', { preferredLocale: newLocale });
      } catch {}
    }

    // Set cookie and navigate
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className={styles.switcher}>
      <button
        className={`${styles.switcher__btn} ${locale === 'en' ? styles['switcher__btn--active'] : ''}`}
        onClick={() => switchLocale('en')}
        disabled={isPending || locale === 'en'}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className={styles.switcher__divider}>|</span>
      <button
        className={`${styles.switcher__btn} ${locale === 'ru' ? styles['switcher__btn--active'] : ''}`}
        onClick={() => switchLocale('ru')}
        disabled={isPending || locale === 'ru'}
        aria-label="Переключить на русский"
      >
        RU
      </button>
    </div>
  );
}
