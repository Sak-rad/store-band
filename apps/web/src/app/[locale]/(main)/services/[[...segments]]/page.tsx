import type { Metadata } from 'next';
import VerticalCatalog, { buildVerticalMetadata } from '@/widgets/catalog/VerticalCatalog';
import { VERTICALS } from '@/shared/lib/verticals';

const vertical = VERTICALS['services'];

interface Props {
  params: Promise<{ locale: string; segments?: string[] }>;
  searchParams: Promise<{ q?: string; priceMin?: string; priceMax?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, segments = [] } = await params;
  return buildVerticalMetadata(vertical, locale, segments);
}

export default async function ServicesPage({ params, searchParams }: Props) {
  const { locale, segments = [] } = await params;
  const sp = await searchParams;
  return <VerticalCatalog vertical={vertical} locale={locale} segments={segments} searchParams={sp} />;
}
