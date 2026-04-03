'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '../../../shared/lib/api';
import { ListingCard } from '../../../entities/listing/ui/ListingCard';
import styles from './ListingGrid.module.scss';

interface Props {
  searchParams: Record<string, string | undefined>;
  locale: string;
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

export function ListingGrid({ searchParams, locale }: Props) {
  const t = useTranslations('listings');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['listings', searchParams, locale],
    queryFn: ({ pageParam }) =>
      api
        .get('/listings', {
          params: {
            ...searchParams,
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

  if (!listings.length) return <p className={styles.empty}>{t('noListings')}</p>;

  return (
    <>
      {total > 0 && (
        <p className={styles.count}>{total} {t('allListings')}</p>
      )}
      <div className={styles.grid}>
        {listings.map((listing: any) => (
          <ListingCard key={listing.id} listing={listing} locale={locale} />
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
