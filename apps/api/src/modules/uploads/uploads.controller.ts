import { Controller, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { UploadsService, PresignDto } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocaleInterceptor } from '../../common/interceptors/locale.interceptor';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LocaleInterceptor)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presign')
  presign(@Body() dto: PresignDto, @CurrentUser('id') userId: string) {
    return this.uploadsService.presign(dto, userId);
  }
}
