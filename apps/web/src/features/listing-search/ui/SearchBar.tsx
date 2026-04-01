'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '../../../navigation';
import { useState } from 'react';
import styles from './SearchBar.module.scss';

export function SearchBar() {
  const t = useTranslations('listings');
  const tC = useTranslations('common');
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.bar} onSubmit={handleSearch}>
        <div className={styles.bar__field}>
          <svg className={styles.bar__icon} width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M13 13L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.bar__input}
            type="text"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className={styles.bar__clear} onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>
        <button className={styles.bar__btn} type="submit">
          {tC('search')}
        </button>
      </form>
    </div>
  );
}
