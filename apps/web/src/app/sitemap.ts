import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_URL  = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001/api';
const LOCALES  = ['en', 'ru'] as const;

function urls(path: string, priority: number, changeFreq: MetadataRoute.Sitemap[number]['changeFrequency']): MetadataRoute.Sitemap {
  return LOCALES.map(locale => ({
    url: `${BASE_URL}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency: changeFreq,
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ────────────────────────────────────────────────────────────
  const staticEntries: MetadataRoute.Sitemap = [
    ...urls('',          1.0, 'daily'),
    ...urls('/listings', 0.9, 'hourly'),
  ];

  // ── All published listing pages ─────────────────────────────────────────────
  let listingEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/listings?limit=500&sort=newest`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const listings: Array<{ id: number; updatedAt?: string }> = json.data ?? [];
      listingEntries = listings.flatMap(l =>
        LOCALES.map(locale => ({
          url: `${BASE_URL}/${locale}/listings/${l.id}`,
          lastModified: l.updatedAt ? new Date(l.updatedAt) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      );
    }
  } catch {
    // API unavailable during build — skip dynamic entries
  }

  return [...staticEntries, ...listingEntries];
}
