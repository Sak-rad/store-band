import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveI18n } from '../../common/helpers/i18n.helper';
import { CreateProviderDto } from './dto/create-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(locale: string) {
    const providers = await this.prisma.provider.findMany({
      orderBy: { name: 'asc' },
    });
    return providers.map((p) => this.resolveProvider(p, locale));
  }

  async findOne(id: number, locale: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.resolveProvider(provider, locale);
  }

  async create(dto: CreateProviderDto, userId: number) {
    const provider = await this.prisma.provider.create({
      data: {
        userId,
        nameI18n: dto.nameI18n as any,
        name: dto.nameI18n.en,
        bioI18n: (dto.bioI18n as any) ?? undefined,
        bio: dto.bioI18n?.en ?? undefined,
        phone: dto.phone,
        website: dto.website,
      },
    });
    return provider;
  }

  async update(id: number, dto: Partial<CreateProviderDto>, userId: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();

    const data: any = {};
    if (dto.nameI18n) {
      data.nameI18n = dto.nameI18n;
      data.name = dto.nameI18n.en;
    }
    if (dto.bioI18n !== undefined) {
      data.bioI18n = dto.bioI18n;
      data.bio = dto.bioI18n?.en ?? null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.website !== undefined) data.website = dto.website;

    return this.prisma.provider.update({ where: { id }, data });
  }

  async getListings(id: number, locale: string) {
    const listings = await this.prisma.listing.findMany({
      where: { providerId: id, deletedAt: null },
      include: {
        media: { take: 1, orderBy: { order: 'asc' } },
        category: true,
        city: true,
        country: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => ({
      ...l,
      title: resolveI18n(l.titleI18n, locale) || l.title,
      description: resolveI18n(l.descriptionI18n, locale) || l.description,
    }));
  }

  async getReviews(id: number) {
    return this.prisma.review.findMany({
      where: { providerId: id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private resolveProvider(provider: any, locale: string) {
    return {
      ...provider,
      name: resolveI18n(provider.nameI18n, locale) || provider.name,
      bio: resolveI18n(provider.bioI18n, locale) || provider.bio,
    };
  }
}
