import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import { EmailService } from '../email.service';

@Processor('notifications')
export class NotificationProcessor {
  constructor(
    private prisma: PrismaService,
    private notifService: NotificationsService,
    private emailService: EmailService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  @Process('booking-request')
  async handleBookingRequest(job: Job<{ bookingId: string; providerUserId: string; listingTitle: string }>) {
    const { bookingId, providerUserId, listingTitle } = job.data;
    const user = await this.prisma.user.findUnique({ where: { id: providerUserId } });
    if (!user) return;

    await this.notifService.create({
      userId: providerUserId,
      type: 'BOOKING_REQUEST',
      titleKey: 'notifications.bookingRequest',
      bodyKey: 'notifications.bookingRequest',
      params: { listing: listingTitle },
      link: `/bookings/${bookingId}`,
    });

    await this.emailQueue.add('send', {
      to: user.email,
      template: 'booking-request',
      locale: user.preferredLocale,
      params: { listingTitle, bookingId },
    });
  }

  @Process('booking-confirmed')
  async handleBookingConfirmed(job: Job<{ bookingId: string; userId: string }>) {
    const { bookingId, userId } = job.data;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.notifService.create({
      userId,
      type: 'BOOKING_CONFIRMED',
      titleKey: 'notifications.bookingConfirmed',
      bodyKey: 'notifications.bookingConfirmed',
      link: `/bookings/${bookingId}`,
    });

    await this.emailQueue.add('send', {
      to: user.email,
      template: 'booking-confirmed',
      locale: user.preferredLocale,
      params: { bookingId },
    });
  }

  @Process('booking-cancelled')
  async handleBookingCancelled(job: Job<{ bookingId: string; userId: string }>) {
    const { bookingId, userId } = job.data;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.notifService.create({
      userId,
      type: 'BOOKING_CANCELLED',
      titleKey: 'notifications.bookingCancelled',
      bodyKey: 'notifications.bookingCancelled',
      link: `/bookings/${bookingId}`,
    });

    await this.emailQueue.add('send', {
      to: user.email,
      template: 'booking-cancelled',
      locale: user.preferredLocale,
      params: { bookingId },
    });
  }

  @Process('new-message')
  async handleNewMessage(job: Job<{ userId: string; senderName: string; chatId: string }>) {
    const { userId, senderName, chatId } = job.data;

    await this.notifService.create({
      userId,
      type: 'NEW_MESSAGE',
      titleKey: 'notifications.newMessage',
      bodyKey: 'notifications.newMessage',
      params: { name: senderName },
      link: `/chats/${chatId}`,
    });
  }
}
