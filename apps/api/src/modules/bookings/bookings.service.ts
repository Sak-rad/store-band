import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private i18n: I18nService,
    @InjectQueue('notifications') private notifQueue: Queue,
  ) {}

  async create(dto: CreateBookingDto, userId: number, lang: string) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        await this.i18n.translate('errors.checkoutBeforeCheckin', { lang }),
      );
    }

    const conflict = await this.prisma.booking.count({
      where: {
        listingId: dto.listingId,
        status: 'CONFIRMED',
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });

    if (conflict > 0) {
      throw new ConflictException(
        await this.i18n.translate('errors.datesUnavailable', { lang }),
      );
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      include: { provider: { include: { user: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = Number(listing.priceMin) * Math.max(nights, 1);

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        listingId: dto.listingId,
        checkIn,
        checkOut,
        guestCount: dto.guestCount ?? 1,
        totalPrice,
        currency: listing.currency,
        notes: dto.notes,
      },
    });

    await this.notifQueue.add('booking-request', {
      bookingId: booking.id,
      providerUserId: listing.provider.userId,
      listingTitle: listing.title,
    });

    return booking;
  }

  async findAll(userId: number, role: string) {
    const where = role === 'USER' ? { userId } : {};
    return this.prisma.booking.findMany({
      where,
      include: {
        listing: { select: { id: true, title: true, titleI18n: true, media: { take: 1 } } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        listing: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException();
    return booking;
  }

  async update(id: number, status: string, lang: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException();

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: status as any },
    });

    const notifType =
      status === 'CONFIRMED' ? 'booking-confirmed' : 'booking-cancelled';
    await this.notifQueue.add(notifType, { bookingId: id, userId: booking.userId });

    return updated;
  }

  async remove(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.userId !== userId) throw new NotFoundException();
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancellationReason: 'Cancelled by user' },
    });
  }
}
