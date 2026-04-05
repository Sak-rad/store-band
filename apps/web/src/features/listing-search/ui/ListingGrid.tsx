'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '../../../navigation';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../shared/lib/api';
import { ListingCard } from '../../../entities/listing/ui/ListingCard';
import styles from './ListingGrid.module.scss';

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'rating_desc'] as const;
type SortOption = typeof SORT_OPTIONS[number];

interface Props {
  filters: Record<string, string | undefined>;
  locale: string;
}

function SortSelect({ current, onChange, label, t }: {
  current: SortOption;
  onChange: (s: SortOption) => void;
  label: string;
  t: (key: string) => string;
}) {
  return (
    <div className={styles.sort}>
      <span className={styles.sort__label}>{label}:</span>
      <select
        className={styles.sort__select}
        value={current}
        onChange={e => onChange(e.target.value as SortOption)}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt} value={opt}>{t(`sort.${opt}`)}</option>
        ))}
      </select>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeleton__image} />
      <div className={styles.skeleton__body}>
        <div className={`${styles.skeleton__line} ${styles['skeleton__line--short']}`} />
        <div className={`${styles.skeleton__line} ${styles['skeleton__line--medium']}`} />
        <div className={`${styles.skeleton__line} ${styles['skeleton__line--full']}`} />
      </div>
    </div>
  );
}

export function ListingGrid({ filters, locale }: Props) {
  const t          = useTranslations('listings');
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const sentinelRef  = useRef<HTMLDivElement>(null);

  const currentSort = (filters.sort ?? searchParams.get('sort') ?? 'newest') as SortOption;

  const changeSort = (sort: SortOption) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('sort', sort);
    router.push(`${pathname}?${qs.toString()}`);
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['listings', filters, locale, currentSort],
    queryFn: ({ pageParam }) =>
      api
        .get('/listings', {
          params: {
            ...filters,
            sort: currentSort,
            lang: locale,
            limit: 15,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        })
        .then((r) => r.data),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError) return <p className={styles.empty}>Something went wrong. Please try again.</p>;

  const listings = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  if (!listings.length) return (
    <>
      <div className={styles.toolbar}>
        <span />
        <SortSelect current={currentSort} onChange={changeSort} label={t('sort.label')} t={t} />
      </div>
      <p className={styles.empty}>{t('noListings')}</p>
    </>
  );

  return (
    <>
      <div className={styles.toolbar}>
        <p className={styles.count}>{total} {t('allListings')}</p>
        <SortSelect current={currentSort} onChange={changeSort} label={t('sort.label')} t={t} />
      </div>
      <div className={styles.grid}>
        {listings.map((listing: any, i: number) => (
          <ListingCard key={listing.id} listing={listing} locale={locale} priority={i < 3} />
        ))}
      </div>

      <div ref={sentinelRef} className={styles.sentinel} />

      {isFetchingNextPage && (
        <div className={styles.loading}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!hasNextPage && listings.length > 0 && (
        <p className={styles.end}>— {t('allListings')} —</p>
      )}
    </>
  );
}
