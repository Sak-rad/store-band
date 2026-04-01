import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { SearchBar } from '../../../../features/listing-search/ui/SearchBar';
import { FilterPanel } from '../../../../features/listing-search/ui/FilterPanel';
import { ListingGrid } from '../../../../features/listing-search/ui/ListingGrid';
import styles from './listings.module.scss';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; country?: string; city?: string; priceMin?: string; priceMax?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'listings' });
  return { title: t('searchTitle') };
}

export default async function ListingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'listings' });

  return (
    <div className={styles.page}>
      <div className={styles.page__search}>
        <SearchBar />
      </div>
      <div className={styles.page__body}>
        <aside className={styles.page__sidebar}>
          <FilterPanel />
        </aside>
        <main className={styles.page__main}>
          <h1 className={styles.page__title}>{t('searchTitle')}</h1>
          <ListingGrid searchParams={sp} locale={locale} />
        </main>
      </div>
    </div>
  );
}
