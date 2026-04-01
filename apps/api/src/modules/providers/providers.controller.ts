import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';

@Controller('providers')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LocaleInterceptor)
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Public()
  @Get()
  findAll(@Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.providersService.findAll(locale);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.providersService.findOne(id, locale);
  }

  @Public()
  @Get(':id/listings')
  getListings(@Param('id') id: string, @Req() req: Request) {
    const locale = (req as any).locale || 'en';
    return this.providersService.getListings(id, locale);
  }

  @Public()
  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.providersService.getReviews(id);
  }

  @Post()
  create(@Body() dto: CreateProviderDto, @CurrentUser('id') userId: string) {
    return this.providersService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProviderDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.providersService.update(id, dto, userId);
  }
}
