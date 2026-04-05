import { ListingSheet } from '../../../../../../features/listing-detail/ui/ListingSheet';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ListingModalPage({ params }: Props) {
  const { locale, id } = await params;
  return <ListingSheet id={id} locale={locale} />;
}
