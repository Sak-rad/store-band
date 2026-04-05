export const CATEGORY_SLUGS = new Set([
  'real-estate', 'apartments', 'villas', 'services', 'excursions',
  'transport', 'food', 'healthcare', 'education',
]);

// Slugs that map to multiple DB categories on the backend
export const REAL_ESTATE_SLUGS = new Set(['apartments', 'villas']);

export const LISTING_TYPE_SLUGS = new Set(['rent', 'buy', 'short-term']);

export interface ListingFilters {
  country?: string;
  city?: string;
  category?: string;
  listingType?: string;
  q?: string;
  priceMin?: string;
  priceMax?: string;
}

/**
 * Parse URL path segments into geo/filter values.
 * Order: [...geo slugs, ...filter slugs] — geo slugs always come first.
 * A segment is a filter if it's in CATEGORY_SLUGS or LISTING_TYPE_SLUGS;
 * otherwise the first unknown slug is country, the second is city.
 */
export function parseSegments(
  segments: string[],
): Pick<ListingFilters, 'country' | 'city' | 'category' | 'listingType'> {
  let country: string | undefined;
  let city: string | undefined;
  let category: string | undefined;
  let listingType: string | undefined;

  for (const seg of segments) {
    if (CATEGORY_SLUGS.has(seg)) {
      category = seg;
    } else if (LISTING_TYPE_SLUGS.has(seg)) {
      listingType = seg;
    } else if (!country) {
      country = seg;
    } else {
      city = seg;
    }
  }

  return { country, city, category, listingType };
}

/**
 * Build a /listings/... path from active geo/filter values.
 * Segment order: [country?, city?, category?, listingType?]
 */
export function buildListingsPath(
  filters: Pick<ListingFilters, 'country' | 'city' | 'category' | 'listingType'>,
): string {
  const segs: string[] = [];
  if (filters.country) segs.push(filters.country);
  if (filters.city && filters.country) segs.push(filters.city);
  if (filters.category) segs.push(filters.category);
  if (filters.listingType) segs.push(filters.listingType);
  return segs.length ? `/listings/${segs.join('/')}` : '/listings';
}
