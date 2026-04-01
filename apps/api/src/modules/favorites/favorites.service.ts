import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            media: { take: 1, orderBy: { order: 'asc' } },
            category: true,
            city: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, listingId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
    });
  }

  async remove(userId: string, listingId: string) {
    return this.prisma.favorite.delete({
      where: { userId_listingId: { userId, listingId } },
    });
  }
}
