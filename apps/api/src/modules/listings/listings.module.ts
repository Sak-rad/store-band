import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsSearchService } from './listings.search.service';
import { ListingsI18nService } from './listings.i18n.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, ListingsSearchService, ListingsI18nService],
  exports: [ListingsService],
})
export class ListingsModule {}
