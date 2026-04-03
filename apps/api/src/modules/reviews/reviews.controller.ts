import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
    return this.reviewsService.findAll({
      listingId: listingId ? parseInt(listingId, 10) : undefined,
      providerId: providerId ? parseInt(providerId, 10) : undefined,
    });
  }

  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser('id') userId: number) {
    return this.reviewsService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateReviewDto>,
    @CurrentUser('id') userId: number,
  ) {
    return this.reviewsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.reviewsService.remove(id, userId);
  }
}
