'use client';

import { CreateBookingForm } from '@/features/create-booking/ui/CreateBookingForm';
import { ExperienceBookingForm } from '@/features/create-booking/ui/ExperienceBookingForm';
import { getListingKind } from '../../../shared/lib/listing-kind';
import { ContactCard } from './ContactCard';

interface Props {
  listing: any;
}

// Chooses the sidebar widget by listing kind:
//   STAY       → date-range booking form
//   EXPERIENCE → single date + guests, priced per person
//   SALE / SERVICE → contact card (chat with provider)
export function BookingPanel({ listing }: Props) {
  const kind = getListingKind(listing);
  if (kind === 'STAY') return <CreateBookingForm listing={listing} />;
  if (kind === 'EXPERIENCE') return <ExperienceBookingForm listing={listing} />;
  return <ContactCard listing={listing} kind={kind} />;
}
