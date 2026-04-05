import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveI18n } from '../../common/helpers/i18n.helper';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(locale: string) {
    const countries = await this.prisma.country.findMany();
    return countries
      .map((c) => ({ ...c, name: resolveI18n(c.nameI18n, locale) || c.name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }

  async findCities(countrySlug: string, locale: string) {
    const cities = await this.prisma.city.findMany({
      where: { country: { slug: countrySlug } },
    });
    return cities
      .map((c) => ({ ...c, name: resolveI18n(c.nameI18n, locale) || c.name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }

  async create(code: string, nameEn: string, nameRu: string, slug: string) {
    const existing = await this.prisma.country.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) throw new ConflictException(`Country with code ${code} already exists`);
    return this.prisma.country.create({
      data: {
        code: code.toUpperCase(),
        name: nameEn,
        nameI18n: { en: nameEn, ru: nameRu },
        slug,
      },
    });
  }
}
