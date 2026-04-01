import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { listingId?: string; providerId?: string }) {
    return this.prisma.review.findMany({
      where: {
        ...(query.listingId ? { listingId: query.listingId } : {}),
        ...(query.providerId ? { providerId: query.providerId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateReviewDto, userId: string) {
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

  async update(id: string, dto: Partial<CreateReviewDto>, userId: string) {
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

  async remove(id: string, userId: string) {
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

  private async updateListingRating(listingId: string) {
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

  private async updateProviderRating(providerId: string) {
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
