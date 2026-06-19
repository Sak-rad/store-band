// Behavioural archetype of a listing — drives price label, booking widget and
// (later) per-kind attributes. The API now returns an explicit `kind`; we fall
// back to deriving it from category + listingType for safety (stale cache, etc).
export type ListingKind = 'STAY' | 'SALE' | 'EXPERIENCE' | 'SERVICE';

const KINDS: ReadonlySet<string> = new Set(['STAY', 'SALE', 'EXPERIENCE', 'SERVICE']);
const REAL_ESTATE_SLUGS = new Set(['real-estate', 'apartments', 'villas']);

interface KindInput {
  kind?: string | null;
  category?: { slug?: string | null } | null;
  listingType?: string | null;
}

export function getListingKind(listing: KindInput): ListingKind {
  if (listing?.kind && KINDS.has(listing.kind)) return listing.kind as ListingKind;

  const slug = listing?.category?.slug ?? '';
  if (REAL_ESTATE_SLUGS.has(slug)) {
    return listing?.listingType === 'buy' ? 'SALE' : 'STAY';
  }
  if (slug === 'excursions') return 'EXPERIENCE';
  return 'SERVICE';
}

interface PriceInput {
  priceOnRequest?: boolean;
  listingType?: string | null;
}

/**
 * i18n key (under the `listings` namespace) for the price period suffix,
 * or null when no suffix should be shown (SALE total, SERVICE "from", on-request).
 */
export function getPriceSuffixKey(listing: PriceInput, kind: ListingKind): string | null {
  if (listing.priceOnRequest) return null;
  switch (kind) {
    case 'STAY':
      return listing.listingType === 'short-term' ? 'perNight' : 'perMonth';
    case 'EXPERIENCE':
      return 'perPerson';
    default:
      return null; // SALE: total price, SERVICE: "from" prefix instead
  }
}
