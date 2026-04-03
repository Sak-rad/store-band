import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LocaleInterceptor)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.favoritesService.findAll(userId);
  }

  @Post()
  add(
    @CurrentUser('id') userId: number,
    @Body('listingId', ParseIntPipe) listingId: number,
  ) {
    return this.favoritesService.add(userId, listingId);
  }

  @Delete(':listingId')
  remove(
    @CurrentUser('id') userId: number,
    @Param('listingId', ParseIntPipe) listingId: number,
  ) {
    return this.favoritesService.remove(userId, listingId);
  }
}
