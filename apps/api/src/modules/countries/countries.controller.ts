import { Controller, Get, Post, Body, Param, Req, UseInterceptors, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CountriesService } from './countries.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';
import { UserRole } from '@prisma/client';

@Controller('countries')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LocaleInterceptor)
export class CountriesController {
  constructor(private countriesService: CountriesService) {}

  @Public()
  @Get()
  findAll(@Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.countriesService.findAll(locale);
  }

  @Public()
  @Get(':slug/cities')
  findCities(@Param('slug') slug: string, @Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.countriesService.findCities(slug, locale);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() body: { code: string; nameEn: string; nameRu: string; slug: string }) {
    return this.countriesService.create(body.code, body.nameEn, body.nameRu, body.slug);
  }
}
