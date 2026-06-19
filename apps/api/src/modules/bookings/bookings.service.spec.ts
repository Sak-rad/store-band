import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService authorization', () => {
  let service: BookingsService;
  let prisma: any;
  let notifQueue: any;

  beforeEach(() => {
    prisma = {
      booking: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn(), create: jest.fn() },
      listing: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    notifQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const i18n = { translate: jest.fn().mockResolvedValue('err') };
    service = new BookingsService(prisma, i18n as any, notifQueue);
  });

  // owner = user 10, provider-owner = user 20
  const booking = (over: Record<string, unknown> = {}) => ({
    id: 1,
    userId: 10,
    status: 'PENDING',
    listing: { provider: { userId: 20 } },
    ...over,
  });

  describe('findOne', () => {
    it('throws Forbidden for an unrelated user', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
      await expect(service.findOne(1, 999)).rejects.toThrow(ForbiddenException);
    });

    it('allows the booking owner', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      await expect(service.findOne(1, 10)).resolves.toMatchObject({ id: 1 });
    });

    it('allows the listing provider', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      await expect(service.findOne(1, 20)).resolves.toMatchObject({ id: 1 });
    });

    it('allows an admin', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      await expect(service.findOne(1, 999)).resolves.toMatchObject({ id: 1 });
    });

    it('throws NotFound when the booking is missing', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.findOne(1, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (status change)', () => {
    it('forbids the booking owner who is not the provider', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
      await expect(service.update(1, 'CONFIRMED', 10, 'en')).rejects.toThrow(ForbiddenException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('lets the listing provider confirm and enqueues a notification', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      prisma.booking.update.mockResolvedValue({ id: 1, status: 'CONFIRMED' });
      await expect(service.update(1, 'CONFIRMED', 20, 'en')).resolves.toMatchObject({
        status: 'CONFIRMED',
      });
      expect(notifQueue.add).toHaveBeenCalledWith('booking-confirmed', expect.any(Object));
    });
  });

  describe('create pricing', () => {
    const listing = (kind: string) => ({
      id: 5, priceMin: 100, currency: 'USD', title: 'X', kind,
      provider: { userId: 20, user: {} },
    });

    it('prices an experience per person and skips the date-conflict check', async () => {
      prisma.listing.findUnique.mockResolvedValue(listing('EXPERIENCE'));
      prisma.booking.create.mockResolvedValue({ id: 1 });
      await service.create(
        { listingId: 5, checkIn: '2026-07-01', checkOut: '2026-07-01', guestCount: 3 } as any,
        10,
        'en',
      );
      expect(prisma.booking.count).not.toHaveBeenCalled();
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalPrice: 300 }) }),
      );
    });

    it('prices a stay per night and runs the conflict check', async () => {
      prisma.listing.findUnique.mockResolvedValue(listing('STAY'));
      prisma.booking.count.mockResolvedValue(0);
      prisma.booking.create.mockResolvedValue({ id: 2 });
      await service.create(
        { listingId: 5, checkIn: '2026-07-01', checkOut: '2026-07-04', guestCount: 1 } as any,
        10,
        'en',
      );
      expect(prisma.booking.count).toHaveBeenCalled();
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalPrice: 300 }) }),
      );
    });

    it('rejects a stay whose checkout is not after checkin', async () => {
      prisma.listing.findUnique.mockResolvedValue(listing('STAY'));
      await expect(
        service.create(
          { listingId: 5, checkIn: '2026-07-04', checkOut: '2026-07-01' } as any,
          10,
          'en',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll scoping', () => {
    it('scopes a USER to their own bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      await service.findAll(10, 'USER');
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10 } }),
      );
    });

    it('scopes a PROVIDER to bookings on their own listings', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      await service.findAll(20, 'PROVIDER');
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { listing: { provider: { userId: 20 } } } }),
      );
    });

    it('does not scope an ADMIN', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      await service.findAll(1, 'ADMIN');
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });
});
