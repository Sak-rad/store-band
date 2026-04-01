import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
