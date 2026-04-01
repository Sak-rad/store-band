'use client';

import { useQuery } from '@tanstack/react-query';
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['listings', searchParams, locale],
    queryFn: () =>
      api.get('/listings', { params: { ...searchParams, lang: locale } }).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError) return <p className={styles.empty}>Something went wrong. Please try again.</p>;
  if (!data?.data?.length) return <p className={styles.empty}>{t('noListings')}</p>;

  return (
    <div className={styles.grid}>
      {data.data.map((listing: any) => (
        <ListingCard key={listing.id} listing={listing} locale={locale} />
      ))}
    </div>
  );
}
