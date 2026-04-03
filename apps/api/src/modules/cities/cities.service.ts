import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveI18n } from '../../common/helpers/i18n.helper';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(countryId: number | undefined, locale: string) {
    const cities = await this.prisma.city.findMany({
      where: countryId ? { countryId } : {},
      orderBy: { name: 'asc' },
    });
    return cities.map((c) => ({
      ...c,
      name: resolveI18n(c.nameI18n, locale) || c.name,
    }));
  }

  async create(countryId: number, nameEn: string, nameRu: string) {
    return this.prisma.city.create({
      data: {
        name: nameEn,
        countryId,
        nameI18n: { en: nameEn, ru: nameRu },
      },
    });
  }
}
