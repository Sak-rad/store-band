import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListingsFilterDto } from './dto/listings-filter.dto';

@Injectable()
export class ListingsSearchService {
  constructor(private prisma: PrismaService) {}

  async search(filter: ListingsFilterDto, _locale: string) {
    const { q, country, city, priceMin, priceMax, currency,
      isFeatured, cursor, limit = 20, sort = 'newest', preferCountry } = filter;

    // Resolve slugs → ids (same pattern as category)
    // 'real-estate' is a virtual slug that maps to both apartments + villas
    let resolvedCategoryId = filter.categoryId;
    let resolvedCategoryIds: number[] | undefined;
    if (!resolvedCategoryId && filter.category) {
      if (filter.category === 'real-estate') {
        const cats = await this.prisma.category.findMany({
          where: { slug: { in: ['apartments', 'villas'] } },
        });
        resolvedCategoryIds = cats.map(c => c.id);
      } else {
        const cat = await this.prisma.category.findUnique({ where: { slug: filter.category } });
        resolvedCategoryId = cat?.id;
      }
    }

    let resolvedCountryId: number | undefined;
    let resolvedCityId: number | undefined;
    if (country) {
      const countryRecord = await this.prisma.country.findUnique({ where: { slug: country } });
      resolvedCountryId = countryRecord?.id;
    }
    if (city && resolvedCountryId) {
      const cityRecord = await this.prisma.city.findFirst({ where: { slug: city, countryId: resolvedCountryId } });
      resolvedCityId = cityRecord?.id;
    }

    const take = Math.min(limit, 50);

    const where: any = {
      isPublished: true,
      isActive: true,
      deletedAt: null,
    };

    if (resolvedCountryId) where.countryId = resolvedCountryId;
    if (resolvedCityId) where.cityId = resolvedCityId;
    if (resolvedCategoryIds?.length) where.categoryId = { in: resolvedCategoryIds };
    else if (resolvedCategoryId) where.categoryId = resolvedCategoryId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    // Filter by priceMin of the listing (always non-null) so we don't lose
    // listings that have priceMax = null (price on request / open range).
    if (priceMin !== undefined) where.priceMin = { gte: priceMin };
    if (priceMax !== undefined) where.priceMin = { ...where.priceMin, lte: priceMax };
    if (currency) where.currency = currency;
    if (filter.listingType) {
      // Listings explicitly marked as also available short-term appear in both searches
      if (filter.listingType === 'short-term') {
        where.OR = [
          ...(where.OR ?? []),
          { listingType: 'short-term' },
          { isShortTermAvailable: true },
        ];
      } else {
        where.listingType = filter.listingType;
      }
    }

    // Full-text search: both i18n languages + address + city/country name.
    // string_contains on JSON paths is case-sensitive in Prisma, so we
    // generate 3 variants: original, lowercase, Capitalised-first.
    if (q) {
      const variants = [...new Set([
        q,
        q.toLowerCase(),
        q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(),
      ])];

      const jsonOr = (field: string, lang: string) =>
        variants.map(v => ({ [field]: { path: [lang], string_contains: v } }));

      where.OR = [
        { title:       { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { address:     { contains: q, mode: 'insensitive' } },
        ...jsonOr('titleI18n', 'en'),
        ...jsonOr('titleI18n', 'ru'),
        ...jsonOr('descriptionI18n', 'en'),
        ...jsonOr('descriptionI18n', 'ru'),
        { city: { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          ...jsonOr('nameI18n', 'ru'),
          ...jsonOr('nameI18n', 'en'),
        ]}},
        { country: { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          ...jsonOr('nameI18n', 'ru'),
          ...jsonOr('nameI18n', 'en'),
        ]}},
      ];
    }

    const orderBy = this.buildOrderBy(sort);
    const include = {
      category: true,
      city: true,
      country: true,
      provider: { select: { id: true, name: true, nameI18n: true, avatarUrl: true, rating: true } },
      media: { orderBy: { order: 'asc' as const }, take: 5 },
    };

    // ── Boosted mode: preferred country always comes first, across all pages ──
    if (preferCountry && !resolvedCountryId) {
      const preferredCountryRecord = await this.prisma.country.findUnique({ where: { slug: preferCountry } });
      const preferredCountryId = preferredCountryRecord?.id;

      if (preferredCountryId) {
        const { oCursor, preferDone } = filter;

        const [total, boostedRaw, othersRaw] = await Promise.all([
          this.prisma.listing.count({ where }),
          // Skip preferred query once exhausted to avoid re-fetching from start
          preferDone
            ? Promise.resolve([])
            : this.prisma.listing.findMany({
                where: { ...where, countryId: preferredCountryId },
                take: take + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy,
                include,
              }),
          // other countries — uses oCursor
          this.prisma.listing.findMany({
            where: { ...where, countryId: { not: preferredCountryId } },
            take: take + 1,
            ...(oCursor ? { cursor: { id: oCursor }, skip: 1 } : {}),
            orderBy,
            include,
          }),
        ]);

        const boostedHasMore = boostedRaw.length > take;
        if (boostedHasMore) boostedRaw.pop();

        const othersHasMore = othersRaw.length > take;
        if (othersHasMore) othersRaw.pop();

        const preferred = boostedRaw.slice(0, take);
        const remaining = take - preferred.length;
        const others = othersRaw.slice(0, remaining);

        return {
          data: [...preferred, ...others],
          nextCursor: boostedHasMore ? (preferred[preferred.length - 1]?.id ?? null) : null,
          nextOCursor: othersHasMore ? (others[others.length - 1]?.id ?? null) : null,
          total,
        };
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const [total, items] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy,
        include,
      }),
    ]);

    let nextCursor: number | null = null;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next!.id;
    }

    return { data: items, nextCursor, total };
  }

  private buildOrderBy(sort: string) {
    switch (sort) {
      case 'price_asc':  return { priceMin: 'asc'  as const };
      case 'price_desc': return { priceMin: 'desc' as const };
      case 'rating_desc': return { rating: 'desc' as const };
      case 'newest':
      default:           return { createdAt: 'desc' as const };
    }
  }
}
