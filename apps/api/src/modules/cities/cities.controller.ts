import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, Req, UseInterceptors, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CitiesService } from './cities.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';
import { UserRole } from '@prisma/client';

@Controller('cities')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LocaleInterceptor)
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Public()
  @Get()
  findAll(@Query('countryId') countryId: string | undefined, @Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.citiesService.findAll(countryId ? parseInt(countryId, 10) : undefined, locale);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() body: { countryId: number; nameEn: string; nameRu: string }) {
    return this.citiesService.create(body.countryId, body.nameEn, body.nameRu);
  }
}
