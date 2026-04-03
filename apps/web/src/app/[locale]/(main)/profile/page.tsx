import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { ProfileView } from '../../../../features/profile/ui/ProfileView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });
  return { title: t('title') };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  return <ProfileView locale={locale} />;
}
