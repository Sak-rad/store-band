import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListingsFilterDto } from './dto/listings-filter.dto';

@Injectable()
export class ListingsSearchService {
  constructor(private prisma: PrismaService) {}

  async search(filter: ListingsFilterDto, locale: string) {
    const { q, countryId, cityId, priceMin, priceMax, currency,
      isFeatured, cursor, limit = 20, sort = 'newest' } = filter;

    // Resolve category slug → id if needed
    let resolvedCategoryId = filter.categoryId;
    if (!resolvedCategoryId && filter.category) {
      const cat = await this.prisma.category.findUnique({ where: { slug: filter.category } });
      resolvedCategoryId = cat?.id;
    }

    const take = Math.min(limit, 50);

    const where: any = {
      isPublished: true,
      deletedAt: null,
    };

    if (countryId) where.countryId = countryId;
    if (cityId) where.cityId = cityId;
    if (resolvedCategoryId) where.categoryId = resolvedCategoryId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (priceMin !== undefined) where.priceMin = { gte: priceMin };
    if (priceMax !== undefined) where.priceMax = { lte: priceMax };
    if (currency) where.currency = currency;
    if (filter.listingType) where.listingType = filter.listingType;

    // Full-text search via Prisma insensitive contains
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.buildOrderBy(sort);

    const [total, items] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy,
        include: {
          category: true,
          city: true,
          country: true,
          provider: { select: { id: true, name: true, nameI18n: true, avatarUrl: true, rating: true } },
          media: { orderBy: { order: 'asc' }, take: 5 },
        },
      }),
    ]);

    let nextCursor: string | null = null;
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
