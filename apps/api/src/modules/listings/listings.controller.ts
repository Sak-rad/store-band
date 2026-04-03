import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, Req, UseGuards, UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsFilterDto } from './dto/listings-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';

@Controller('listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LocaleInterceptor)
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  @Public()
  @Get()
  findAll(@Query() filter: ListingsFilterDto, @Req() req: Request) {
    return this.listingsService.findAll(filter, (req as any).locale || 'en');
  }

  // Admin: get pending listings for approval
  @Get('pending')
  @Roles('ADMIN')
  findPending() {
    return this.listingsService.findPending();
  }

  // Provider: get own listings
  @Get('my')
  @Roles('PROVIDER', 'ADMIN')
  findMine(@CurrentUser('id') userId: number) {
    return this.listingsService.findByProvider(userId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.listingsService.findOne(id, (req as any).locale || 'en');
  }

  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.listingsService.getAvailability(id, new Date(from), new Date(to));
  }

  @Post()
  @Roles('PROVIDER', 'ADMIN')
  create(@Body() dto: CreateListingDto, @CurrentUser('id') userId: number) {
    return this.listingsService.create(dto, userId);
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.approve(id);
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.reject(id);
  }

  @Patch(':id')
  @Roles('PROVIDER', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListingDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.listingsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('PROVIDER', 'ADMIN')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.listingsService.remove(id, userId);
  }
}
