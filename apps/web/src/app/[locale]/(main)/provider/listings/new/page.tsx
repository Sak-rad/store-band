import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { CreateListingForm } from '../../../../../../features/create-listing/ui/CreateListingForm';

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'provider' });
  return { title: t('createListing') };
}

export default async function NewListingPage({ params }: Props) {
  const { locale } = await params;
  return <CreateListingForm locale={locale} />;
}
