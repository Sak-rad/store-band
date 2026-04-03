import { Controller, Get, Patch, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: number,
    @Query('read') read?: string,
  ) {
    return this.notificationsService.findAll(userId, read === 'false');
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.notificationsService.markRead(id, userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: number) {
    return this.notificationsService.markAllRead(userId);
  }
}
