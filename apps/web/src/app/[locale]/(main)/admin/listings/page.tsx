import type { Metadata } from 'next';
import { AdminListingsPanel } from '@/features/admin';

export const metadata: Metadata = { title: 'Admin — Pending Listings' };

export default async function AdminListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AdminListingsPanel locale={locale} />;
}
