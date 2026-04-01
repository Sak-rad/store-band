import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveI18n } from '../../common/helpers/i18n.helper';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(locale: string) {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => ({
      ...c,
      name: resolveI18n(c.nameI18n, locale) || c.name,
    }));
  }
}
