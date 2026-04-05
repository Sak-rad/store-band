import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { SearchBar } from '../../../../../features/listing-search/ui/SearchBar';
import { FilterPanel } from '../../../../../features/listing-search/ui/FilterPanel';
import { ListingGrid } from '../../../../../features/listing-search/ui/ListingGrid';
import { apiServer } from '../../../../../shared/lib/api-server';
import { parseSegments, buildListingsPath } from '../../../../../shared/lib/listing-segments';
import styles from '../listings.module.scss';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface SearchParams {
  q?: string;
  priceMin?: string;
  priceMax?: string;
  [key: string]: string | undefined;
}

interface Props {
  params: Promise<{ locale: string; segments: string[] }>;
  searchParams: Promise<SearchParams>;
}

// ── Location resolver (deduplicates across generateMetadata + render) ──────────

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
    const country = (countriesRes.data as Array<{ slug: string; name: string }>)
      .find(c => c.slug === countrySlug);
    const city = citiesRes
      ? (citiesRes.data as Array<{ slug: string; name: string }>).find(c => c.slug === citySlug)
      : undefined;
    return { countryName: country?.name ?? null, cityName: city?.name ?? null };
  } catch {
    return { countryName: null, cityName: null };
  }
});

// ── Title/description builder ──────────────────────────────────────────────────

function buildPageText(
  t: Awaited<ReturnType<typeof getTranslations<'listings'>>>,
  filters: ReturnType<typeof parseSegments>,
  countryName: string | null,
  cityName: string | null,
) {
  const key = filters.category ?? filters.listingType ?? null;
  const titleKeys = t.raw('pageTitle') as Record<string, string>;
  const descKeys  = t.raw('pageDesc')  as Record<string, string>;

  const baseTitle = (key && titleKeys[key]) ? titleKeys[key]! : titleKeys['default']!;
  const baseDesc  = (key && descKeys[key])  ? descKeys[key]!  : descKeys['default']!;

  let title = baseTitle;
  if (cityName && countryName) {
    title = t('pageTitleInCity', { title: baseTitle, city: cityName, country: countryName });
  } else if (countryName) {
    title = t('pageTitleInCountry', { title: baseTitle, country: countryName });
  }

  const location = [cityName, countryName].filter(Boolean).join(', ');
  const description = location
    ? `${baseDesc} ${t('pageDescSuffix', { location })}`
    : baseDesc;

  return { title, description, h1: title };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, segments } = await params;
  await searchParams; // consume to satisfy Next.js
  const filters = parseSegments(segments);
  const t     = await getTranslations({ locale, namespace: 'listings' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  const { countryName, cityName } = await resolveLocation(filters.country, filters.city, locale);
  const { title, description } = buildPageText(t, filters, countryName, cityName);

  const pageUrl = `${BASE_URL}/${locale}/${buildListingsPath(filters).slice(1)}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${BASE_URL}/en/${buildListingsPath(filters).slice(1)}`,
        ru: `${BASE_URL}/ru/${buildListingsPath(filters).slice(1)}`,
        'x-default': `${BASE_URL}/en/${buildListingsPath(filters).slice(1)}`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: tMeta('listingsSiteName'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ListingsSegmentsPage({ params, searchParams }: Props) {
  const { locale, segments } = await params;
  const sp = await searchParams;

  // Redirect old numeric-ID URLs → /listing/:id
  if (segments.length === 1 && /^\d+$/.test(segments[0])) {
    redirect(`/${locale}/listing/${segments[0]}`);
  }

  const filters = parseSegments(segments);
  const t     = await getTranslations({ locale, namespace: 'listings' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  const { countryName, cityName } = await resolveLocation(filters.country, filters.city, locale);
  const { h1 } = buildPageText(t, filters, countryName, cityName);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tMeta('listingsSiteName'), item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: h1, item: `${BASE_URL}/${locale}/${buildListingsPath(filters).slice(1)}` },
    ],
  };

  const gridFilters = {
    ...filters,
    q:        sp.q,
    priceMin: sp.priceMin,
    priceMax: sp.priceMax,
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

          <ListingGrid filters={gridFilters} locale={locale} />
        </main>
      </div>
    </div>
  );
}
