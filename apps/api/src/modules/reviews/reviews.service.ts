import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { listingId?: number; providerId?: number; cursor?: number; take?: number }) {
    const take = Math.min(query.take ?? 5, 50);
    const where = {
      ...(query.listingId  ? { listingId:  query.listingId  } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
    ]);

    let nextCursor: number | null = null;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next!.id;
    }

    return { data: items, nextCursor, total };
  }

  async findMy(userId: number) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        listing: {
          select: {
            id: true, title: true,
            media: { take: 1, orderBy: { order: 'asc' }, select: { thumbUrl: true, url: true } },
          },
        },
        provider: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateReviewDto, userId: number) {
    const review = await this.prisma.review.create({
      data: {
        userId,
        listingId: dto.listingId,
        providerId: dto.providerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    if (dto.listingId) {
      await this.updateListingRating(dto.listingId);
    }
    if (dto.providerId) {
      await this.updateProviderRating(dto.providerId);
    }

    return review;
  }

  async update(id: number, dto: Partial<CreateReviewDto>, userId: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
      },
    });

    if (review.listingId) {
      await this.updateListingRating(review.listingId);
    }
    if (review.providerId) {
      await this.updateProviderRating(review.providerId);
    }

    return updated;
  }

  async remove(id: number, userId: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();

    const deleted = await this.prisma.review.delete({ where: { id } });

    if (review.listingId) {
      await this.updateListingRating(review.listingId);
    }
    if (review.providerId) {
      await this.updateProviderRating(review.providerId);
    }

    return deleted;
  }

  private async updateListingRating(listingId: number) {
    const agg = await this.prisma.review.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: { id: true },
    });
    const avgRating = agg._avg.rating ?? 0;
    const count = agg._count.id;
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { rating: avgRating, reviewCount: count },
    });
  }

  private async updateProviderRating(providerId: number) {
    const agg = await this.prisma.review.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: { id: true },
    });
    const avgRating = agg._avg.rating ?? 0;
    const count = agg._count.id;
    await this.prisma.provider.update({
      where: { id: providerId },
      data: { rating: avgRating, reviewCount: count },
    });
  }
}
