import type { ListingKind } from './listing-kind';

// A vertical is a presentation layer over the shared catalog: it pins a set of
// kinds and reuses existing listings i18n keys for title/description.
export interface VerticalConfig {
  slug: string;
  kinds: ListingKind[];
  titleKey: string; // key under the `listings.pageTitle` namespace
  descKey: string;  // key under the `listings.pageDesc` namespace
  categories: string[]; // category slugs the FilterPanel should expose in this vertical
}

export const VERTICALS: Record<string, VerticalConfig> = {
  'real-estate': { slug: 'real-estate', kinds: ['STAY', 'SALE'], titleKey: 'real-estate', descKey: 'real-estate', categories: ['real-estate', 'apartments', 'villas'] },
  'experiences': { slug: 'experiences', kinds: ['EXPERIENCE'],   titleKey: 'excursions',  descKey: 'excursions',  categories: ['excursions'] },
  'services':    { slug: 'services',    kinds: ['SERVICE'],      titleKey: 'services',    descKey: 'services',    categories: ['services', 'transport', 'food', 'healthcare', 'education'] },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS);

// Comma-separated value for the API `kind` filter.
export function kindParam(v: VerticalConfig): string {
  return v.kinds.join(',');
}

// Reverse lookup: which vertical owns a given category/listingType filter.
// Used to canonicalise /listings/<category> refinements onto their vertical so
// the two routes don't compete as duplicate content. Returns null for pure-geo
// or unfiltered /listings, which stays a legitimate cross-vertical catalog.
export function verticalForFilters(filters: { category?: string; listingType?: string }): VerticalConfig | null {
  if (filters.category) {
    const owner = Object.values(VERTICALS).find(v => v.categories.includes(filters.category!));
    if (owner) return owner;
  }
  // rent/buy/short-term are real-estate concepts
  if (filters.listingType) return VERTICALS['real-estate'];
  return null;
}
