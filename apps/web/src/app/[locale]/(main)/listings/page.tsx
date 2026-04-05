import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { SearchBar } from '../../../../features/listing-search/ui/SearchBar';
import { FilterPanel } from '../../../../features/listing-search/ui/FilterPanel';
import { ListingGrid } from '../../../../features/listing-search/ui/ListingGrid';
import styles from './listings.module.scss';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface SearchParams {
  q?: string;
  priceMin?: string;
  priceMax?: string;
  [key: string]: string | undefined;
}

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t     = await getTranslations({ locale, namespace: 'listings' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });
  const pageUrl = `${BASE_URL}/${locale}/listings`;

  return {
    title:       t('pageTitle.default' as any),
    description: t('pageDesc.default' as any),
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${BASE_URL}/en/listings`,
        ru: `${BASE_URL}/ru/listings`,
        'x-default': `${BASE_URL}/en/listings`,
      },
    },
    openGraph: {
      title:       t('pageTitle.default' as any),
      description: t('pageDesc.default' as any),
      url:         pageUrl,
      siteName:    tMeta('listingsSiteName'),
      type:        'website',
      locale:      locale === 'ru' ? 'ru_RU' : 'en_US',
    },
    twitter: {
      card:        'summary_large_image',
      title:       t('pageTitle.default' as any),
      description: t('pageDesc.default' as any),
    },
  };
}

export default async function ListingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t     = await getTranslations({ locale, namespace: 'listings' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  const h1 = t('pageTitle.default' as any);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tMeta('listingsSiteName'), item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: h1, item: `${BASE_URL}/${locale}/listings` },
    ],
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className={styles.page__search}>
        <SearchBar />
      </div>

      <div className={styles.page__body}>
        <aside className={styles.page__sidebar}>
          <FilterPanel />
        </aside>

        <main className={styles.page__main}>
          <h1 className={styles.page__title}>{h1}</h1>

          <div className={styles.page__mobile_filter}>
            <FilterPanel />
          </div>

          <ListingGrid filters={{ q: sp.q, priceMin: sp.priceMin, priceMax: sp.priceMax }} locale={locale} />
        </main>
      </div>
    </div>
  );
}
