import { Injectable } from '@nestjs/common';
import { resolveI18n } from '../../common/helpers/i18n.helper';

@Injectable()
export class ListingsI18nService {
  resolveListing(item: any, locale: string) {
    return {
      ...item,
      title: resolveI18n(item.titleI18n, locale),
      description: resolveI18n(item.descriptionI18n, locale),
      category: item.category
        ? { ...item.category, name: resolveI18n(item.category.nameI18n, locale) }
        : undefined,
      city: item.city
        ? { ...item.city, name: resolveI18n(item.city.nameI18n, locale) }
        : undefined,
      country: item.country
        ? { ...item.country, name: resolveI18n(item.country.nameI18n, locale) }
        : undefined,
    };
  }

  resolveListings(items: any[], locale: string) {
    return items.map((item) => this.resolveListing(item, locale));
  }
}
