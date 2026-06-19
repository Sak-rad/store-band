import { ListingKind } from '@prisma/client';

const REAL_ESTATE_SLUGS = new Set(['real-estate', 'apartments', 'villas']);

// Single source of truth for mapping a category + listingType to a kind.
// Keep in sync with the SQL backfill in the add_listing_kind migration.
export function deriveListingKind(
  categorySlug: string | null | undefined,
  listingType?: string | null,
): ListingKind {
  const slug = categorySlug ?? '';
  if (REAL_ESTATE_SLUGS.has(slug)) {
    return listingType === 'buy' ? ListingKind.SALE : ListingKind.STAY;
  }
  if (slug === 'excursions') return ListingKind.EXPERIENCE;
  return ListingKind.SERVICE;
}
