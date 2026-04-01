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

  async findOne(id: string, locale: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        city: true,
        country: true,
        provider: { select: { id: true, name: true, nameI18n: true, avatarUrl: true, rating: true, reviewCount: true } },
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

  async create(dto: CreateListingDto, providerId: string) {
    if (!dto.titleI18n?.en || !dto.titleI18n?.ru) {
      throw new BadRequestException('Both EN and RU title are required');
    }
    if (!dto.descriptionI18n?.en || !dto.descriptionI18n?.ru) {
      throw new BadRequestException('Both EN and RU description are required');
    }

    return this.prisma.listing.create({
      data: {
        titleI18n: dto.titleI18n as any,
        descriptionI18n: dto.descriptionI18n as any,
        title: dto.titleI18n.en,
        description: dto.descriptionI18n.en,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        currency: dto.currency,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        categoryId: dto.categoryId,
        cityId: dto.cityId,
        countryId: dto.countryId,
        providerId,
        isPublished: dto.isPublished ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateListingDto, providerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    if (listing.providerId !== providerId) throw new ForbiddenException();

    const data: any = { ...dto };
    if (dto.titleI18n) {
      data.title = dto.titleI18n.en;
    }
    if (dto.descriptionI18n) {
      data.description = dto.descriptionI18n.en;
    }

    return this.prisma.listing.update({ where: { id }, data });
  }

  async remove(id: string, providerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    if (listing.providerId !== providerId) throw new ForbiddenException();
    return this.prisma.listing.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getAvailability(id: string, from: Date, to: Date) {
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
}
