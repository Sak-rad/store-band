import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { apiServer } from '../../../../../shared/lib/api-server';
import { ProviderDetail } from '../../../../../features/provider-detail/ui/ProviderDetail';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  try {
    const { data: p } = await apiServer.get(`/providers/${id}`, { params: { lang: locale } });
    return {
      title: p.name,
      description: p.bio?.slice(0, 160) ?? undefined,
    };
  } catch {
    const t = await getTranslations({ locale, namespace: 'provider' });
    return { title: t('viewProfile') };
  }
}

export default async function ProviderPage({ params }: Props) {
  const { locale, id } = await params;

  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  return <ProviderDetail id={numId} locale={locale} />;
}
