import { cache } from 'react';
import type { Metadata } from 'next';
import type { InfiniteData } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/features/listing-search/ui/SearchBar';
import { FilterPanel } from '@/features/listing-search/ui/FilterPanel';
import { ListingGrid, type ListingsPage } from '@/features/listing-search/ui/ListingGrid';
import { apiServer } from '@/shared/lib/api-server';
import { parseSegments } from '@/shared/lib/listing-segments';
import { kindParam, type VerticalConfig } from '@/shared/lib/verticals';
import styles from './VerticalCatalog.module.scss';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface SearchParams {
  q?: string;
  priceMin?: string;
  priceMax?: string;
}

// Resolve country/city slugs → display names (shared by metadata + render).
const resolveLocation = cache(async (
  countrySlug: string | undefined,
  citySlug: string | undefined,
  locale: string,
): Promise<{ countryName: string | null; cityName: string | null }> => {
  if (!countrySlug) return { countryName: null, cityName: null };
  try {
    const [countriesRes, citiesRes] = await Promise.all([
      apiServer.get('/countries', { params: { lang: locale } }),
      citySlug
        ? apiServer.get(`/countries/${countrySlug}/cities`, { params: { lang: locale } })
        : Promise.resolve(null),
    ]);
    const country = (countriesRes.data as Array<{ slug: string; name: string }>).find((c) => c.slug === countrySlug);
    const city = citiesRes
      ? (citiesRes.data as Array<{ slug: string; name: string }>).find((c) => c.slug === citySlug)
      : undefined;
    return { countryName: country?.name ?? null, cityName: city?.name ?? null };
  } catch {
    return { countryName: null, cityName: null };
  }
});

async function buildText(vertical: VerticalConfig, locale: string, segments: string[]) {
  const { country, city } = parseSegments(segments);
  const t = await getTranslations({ locale, namespace: 'listings' });
  const { countryName, cityName } = await resolveLocation(country, city, locale);

  const titleKeys = t.raw('pageTitle') as Record<string, string>;
  const descKeys = t.raw('pageDesc') as Record<string, string>;
  const baseTitle = titleKeys[vertical.titleKey] ?? titleKeys['default'];
  const baseDesc = descKeys[vertical.descKey] ?? descKeys['default'];

  let title = baseTitle;
  if (cityName && countryName) title = t('pageTitleInCity', { title: baseTitle, city: cityName, country: countryName });
  else if (countryName) title = t('pageTitleInCountry', { title: baseTitle, country: countryName });

  const location = [cityName, countryName].filter(Boolean).join(', ');
  const description = location ? `${baseDesc} ${t('pageDescSuffix', { location })}` : baseDesc;

  const path = [vertical.slug, country, city && country ? city : undefined].filter(Boolean).join('/');
  return { title, description, h1: title, country, city, path };
}

export async function buildVerticalMetadata(
  vertical: VerticalConfig,
  locale: string,
  segments: string[],
): Promise<Metadata> {
  const { title, description, path } = await buildText(vertical, locale, segments);
  const url = `${BASE_URL}/${locale}/${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `${BASE_URL}/en/${path}`,
        ru: `${BASE_URL}/ru/${path}`,
        'x-default': `${BASE_URL}/en/${path}`,
      },
    },
    openGraph: { title, description, url, type: 'website', locale: locale === 'ru' ? 'ru_RU' : 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

interface Props {
  vertical: VerticalConfig;
  locale: string;
  segments: string[];
  searchParams: SearchParams;
}

export default async function VerticalCatalog({ vertical, locale, segments, searchParams }: Props) {
  const { h1, country, city, path } = await buildText(vertical, locale, segments);
  const { category, listingType } = parseSegments(segments);

  const gridFilters: Record<string, string | undefined> = {
    kind: kindParam(vertical),
    country,
    city,
    category,
    listingType,
    q: searchParams.q,
    priceMin: searchParams.priceMin,
    priceMax: searchParams.priceMax,
  };

  let initialData: InfiniteData<ListingsPage, unknown> | undefined;
  try {
    const res = await apiServer.get('/listings', { params: { ...gridFilters, limit: 15, sort: 'newest', lang: locale } });
    initialData = { pages: [res.data], pageParams: [undefined] };
  } catch {
    initialData = undefined;
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Meriloz', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: h1, item: `${BASE_URL}/${locale}/${path}` },
    ],
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className={styles.page__search}>
        <SearchBar basePath={`/${vertical.slug}`} />
      </div>

      <div className={styles.page__body}>
        <aside className={styles.page__sidebar}>
          <FilterPanel basePath={`/${vertical.slug}`} categories={vertical.categories} />
        </aside>

        <main className={styles.page__main}>
          <h1 className={styles.page__title}>{h1}</h1>

          <div className={styles.page__mobile_filter}>
            <FilterPanel basePath={`/${vertical.slug}`} categories={vertical.categories} />
          </div>

          <ListingGrid filters={gridFilters} locale={locale} initialData={initialData} />
        </main>
      </div>
    </div>
  );
}
