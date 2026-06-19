import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      include: { provider: { include: { user: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    // Experiences price per person on a single date; stays price per night and
    // reserve a date range (so they check for conflicts).
    const isExperience = listing.kind === 'EXPERIENCE';
    const guests = Math.max(dto.guestCount ?? 1, 1);

    let totalPrice: number;
    if (isExperience) {
      totalPrice = Number(listing.priceMin) * guests;
    } else {
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

      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      totalPrice = Number(listing.priceMin) * Math.max(nights, 1);
    }

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
    // USER sees own bookings; PROVIDER sees bookings on their own listings; ADMIN sees all.
    const where =
      role === 'USER'
        ? { userId }
        : role === 'PROVIDER'
          ? { listing: { provider: { userId } } }
          : {};
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
        listing: { include: { provider: { select: { userId: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException();
    await this.assertCanAccess(booking, userId);
    return booking;
  }

  async update(id: number, status: string, userId: number, lang: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { listing: { include: { provider: { select: { userId: true } } } } },
    });
    if (!booking) throw new NotFoundException();

    // Only the provider who owns the listing (or an admin) may confirm/cancel a booking.
    const isProvider = booking.listing.provider?.userId === userId;
    if (!isProvider && !(await this.isAdmin(userId))) throw new ForbiddenException();

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

  private async isAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }

  // Booking is visible to its owner, to the provider who owns the listing, or to an admin.
  private async assertCanAccess(
    booking: { userId: number; listing: { provider: { userId: number } | null } },
    userId: number,
  ) {
    const isOwner = booking.userId === userId;
    const isProvider = booking.listing.provider?.userId === userId;
    if (!isOwner && !isProvider && !(await this.isAdmin(userId))) {
      throw new ForbiddenException();
    }
  }
}
