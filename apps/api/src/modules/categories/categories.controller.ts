import { Controller, Get, Req, UseInterceptors, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';

@Controller('categories')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LocaleInterceptor)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll(@Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.categoriesService.findAll(locale);
  }
}
