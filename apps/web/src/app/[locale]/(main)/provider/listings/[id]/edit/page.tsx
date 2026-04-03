import type { Metadata } from 'next';
import { EditListingForm } from '../../../../../../../features/create-listing/ui/EditListingForm';

interface Props { params: Promise<{ locale: string; id: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Edit Listing' };
}

export default async function EditListingPage({ params }: Props) {
  const { locale, id } = await params;
  return <EditListingForm locale={locale} listingId={id} />;
}
