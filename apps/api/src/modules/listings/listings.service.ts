import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListingsSearchService } from './listings.search.service';
import { ListingsI18nService } from './listings.i18n.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsFilterDto } from './dto/listings-filter.dto';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private search: ListingsSearchService,
    private i18nResolver: ListingsI18nService,
  ) {}

  async findAll(filter: ListingsFilterDto, locale: string) {
    const result = await this.search.search(filter, locale);
    return {
      ...result,
      data: this.i18nResolver.resolveListings(result.data, locale),
    };
  }

  async findOne(id: number, locale: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        city: true,
        country: true,
        provider: {
          select: {
            id: true, name: true, nameI18n: true, avatarUrl: true,
            rating: true, reviewCount: true, isVerified: true, phone: true, website: true,
          },
        },
        media: { orderBy: { order: 'asc' } },
        reviews: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.i18nResolver.resolveListing(listing, locale);
  }

  async create(dto: CreateListingDto, userId: number) {
    if (!dto.titleI18n?.en || !dto.titleI18n?.ru) {
      throw new BadRequestException('Both EN and RU title are required');
    }
    if (!dto.descriptionI18n?.en || !dto.descriptionI18n?.ru) {
      throw new BadRequestException('Both EN and RU description are required');
    }

    // Auto-create provider profile if missing (user has PROVIDER role but no profile yet)
    let provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const name = user?.name || user?.email || 'Provider';
      provider = await this.prisma.provider.create({
        data: { userId, name, nameI18n: { en: name, ru: name } },
      });
    }

    const priceOnRequest = dto.priceOnRequest ?? false;
    const photos = dto.photoUrls ?? [];

    return this.prisma.listing.create({
      data: {
        titleI18n: dto.titleI18n as any,
        descriptionI18n: dto.descriptionI18n as any,
        title: dto.titleI18n.en,
        description: dto.descriptionI18n.en,
        priceMin: priceOnRequest ? 0 : (dto.priceMin ?? 0),
        priceMax: dto.priceMax,
        priceOnRequest,
        currency: dto.currency ?? 'USD',
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        categoryId: dto.categoryId,
        cityId: dto.cityId,
        countryId: dto.countryId,
        providerId: provider.id,
        listingType: dto.listingType ?? 'rent',
        isPublished: false,
        ...(photos.length > 0 && {
          media: {
            createMany: {
              data: photos.map((url, i) => ({ url, thumbUrl: url, order: i })),
            },
          },
        }),
      },
    });
  }

  async approve(id: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    return this.prisma.listing.update({ where: { id }, data: { isPublished: true } });
  }

  async reject(id: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    return this.prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findPending() {
    return this.prisma.listing.findMany({
      where: { isPublished: false, deletedAt: null },
      include: {
        category: true,
        city: true,
        country: true,
        provider: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
        media: { orderBy: { order: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, dto: UpdateListingDto, providerId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    if (listing.providerId !== providerId) throw new ForbiddenException();

    const data: any = { ...dto };
    if (dto.titleI18n) data.title = dto.titleI18n.en;
    if (dto.descriptionI18n) data.description = dto.descriptionI18n.en;

    return this.prisma.listing.update({ where: { id }, data });
  }

  async remove(id: number, providerId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    if (listing.providerId !== providerId) throw new ForbiddenException();
    return this.prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getAvailability(id: number, from: Date, to: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: id,
        status: 'CONFIRMED',
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      select: { checkIn: true, checkOut: true },
    });
    return { bookedRanges: bookings };
  }

  async findByProvider(userId: number) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) return [];
    return this.prisma.listing.findMany({
      where: { providerId: provider.id, deletedAt: null },
      include: {
        category: true,
        city: true,
        media: { orderBy: { order: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
