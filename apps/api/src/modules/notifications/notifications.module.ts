import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './processors/notification.processor';
import { EmailService } from './email.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    BullModule.registerQueue({ name: 'email' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor, EmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
