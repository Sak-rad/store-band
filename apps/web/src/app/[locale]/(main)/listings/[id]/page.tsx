import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { ListingDetail } from '../../../../../features/listing-detail/ui/ListingDetail';
import { apiServer } from '../../../../../shared/lib/api-server';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  try {
    const listing = await apiServer.get(`/listings/${id}`, { headers: { 'Accept-Language': locale } });
    return {
      title: listing.data.title,
      description: listing.data.description?.slice(0, 160),
      alternates: {
        languages: {
          en: `/en/listings/${id}`,
          ru: `/ru/listings/${id}`,
        },
      },
      openGraph: {
        title: listing.data.title,
        images: listing.data.media?.[0]?.url ? [listing.data.media[0].url] : [],
      },
    };
  } catch {
    const t = await getTranslations({ locale, namespace: 'listings' });
    return { title: t('searchTitle') };
  }
}

export default async function ListingPage({ params }: Props) {
  const { locale, id } = await params;
  return <ListingDetail id={id} locale={locale} />;
}
