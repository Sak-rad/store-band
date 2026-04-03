import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveI18n } from '../../common/helpers/i18n.helper';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(locale: string) {
    const countries = await this.prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
    return countries.map((c) => ({
      ...c,
      name: resolveI18n(c.nameI18n, locale) || c.name,
    }));
  }

  async findCities(countryId: number, locale: string) {
    const cities = await this.prisma.city.findMany({
      where: { countryId },
      orderBy: { name: 'asc' },
    });
    return cities.map((c) => ({
      ...c,
      name: resolveI18n(c.nameI18n, locale) || c.name,
    }));
  }

  async create(code: string, nameEn: string, nameRu: string) {
    const existing = await this.prisma.country.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) throw new ConflictException(`Country with code ${code} already exists`);
    return this.prisma.country.create({
      data: {
        code: code.toUpperCase(),
        name: nameEn,
        nameI18n: { en: nameEn, ru: nameRu },
      },
    });
  }
}
