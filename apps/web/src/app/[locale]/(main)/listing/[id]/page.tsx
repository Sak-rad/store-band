import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { ListingDetail } from '@/widgets/listing-detail';
import { apiServer } from '../../../../../shared/lib/api-server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  try {
    const { data: l } = await apiServer.get(`/listings/${id}`, {
      params: { lang: locale },
    });

    const geo = [l.city?.name, l.country?.name].filter(Boolean).join(', ');
    const title       = geo ? `${l.title} — ${geo}` : l.title;
    const description = l.description?.slice(0, 160) ?? '';
    const image       = l.media?.[0]?.url;
    const pageUrl     = `${BASE_URL}/${locale}/listing/${id}`;

    return {
      title,
      description,
      alternates: {
        canonical: pageUrl,
        languages: {
          en: `${BASE_URL}/en/listing/${id}`,
          ru: `${BASE_URL}/ru/listing/${id}`,
          'x-default': `${BASE_URL}/en/listing/${id}`,
        },
      },
      openGraph: {
        title,
        description,
        url: pageUrl,
        type: 'article',
        ...(image && { images: [{ url: image, width: 1200, height: 800 }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    const t = await getTranslations({ locale, namespace: 'listings' });
    return { title: t('searchTitle') };
  }
}

// ── JSON-LD ────────────────────────────────────────────────────────────────────

const REAL_ESTATE_SLUGS = new Set(['apartments', 'villas']);

function buildJsonLd(l: any, locale: string, id: string) {
  const pageUrl      = `${BASE_URL}/${locale}/listing/${id}`;
  const isRealEstate = REAL_ESTATE_SLUGS.has(l.category?.slug ?? '');
  const isShortTerm  = l.listingType === 'short-term' || l.isShortTermAvailable;

  const base = {
    '@context': 'https://schema.org',
    '@type': isRealEstate ? (isShortTerm ? 'LodgingBusiness' : 'Apartment') : 'LocalBusiness',
    name:        l.title,
    description: l.description?.slice(0, 250),
    url:         pageUrl,
    ...(l.media?.[0]?.url && { image: l.media[0].url }),
    address: {
      '@type':         'PostalAddress',
      addressLocality: l.city?.name,
      addressCountry:  l.country?.name,
      ...(l.address && { streetAddress: l.address }),
    },
    ...(!l.priceOnRequest && l.priceMin && {
      offers: {
        '@type':       'Offer',
        price:         Number(l.priceMin),
        priceCurrency: l.currency || 'USD',
        availability:  'https://schema.org/InStock',
        ...(isRealEstate && !isShortTerm && {
          priceSpecification: { '@type': 'UnitPriceSpecification', unitCode: 'MON' },
        }),
      },
    }),
    ...(l.rating > 0 && {
      aggregateRating: {
        '@type':      'AggregateRating',
        ratingValue:  l.rating.toFixed(1),
        reviewCount:  l.reviewCount,
        bestRating:   5,
        worstRating:  1,
      },
    }),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Relocation Platform', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: l.category?.name ?? 'Listings', item: `${BASE_URL}/${locale}/listings` },
      { '@type': 'ListItem', position: 3, name: l.title, item: pageUrl },
    ],
  };

  return [base, breadcrumb];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ListingPage({ params }: Props) {
  const { locale, id } = await params;

  let jsonLd: object[] = [];
  try {
    const { data: l } = await apiServer.get(`/listings/${id}`, { params: { lang: locale } });
    jsonLd = buildJsonLd(l, locale, id);
  } catch {
    // render page without structured data if API fails
  }

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ListingDetail id={id} locale={locale} />
    </>
  );
}
