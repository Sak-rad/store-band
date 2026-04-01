import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LocaleInterceptor)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get()
  findAll(
    @Query('listingId') listingId?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.reviewsService.findAll({ listingId, providerId });
  }

  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser('id') userId: string) {
    return this.reviewsService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateReviewDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reviewsService.remove(id, userId);
  }
}
