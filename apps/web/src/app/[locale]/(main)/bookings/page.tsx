import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { BookingsList } from '@/widgets/bookings';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });
  return { title: t('checkIn') };
}

export default function BookingsPage() {
  return <BookingsList />;
}
