import { ListingsSearchService } from './listings.search.service';

describe('ListingsSearchService kind filter', () => {
  let service: ListingsSearchService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      listing: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      category: { findUnique: jest.fn(), findMany: jest.fn() },
      country: { findUnique: jest.fn() },
      city: { findFirst: jest.fn() },
    };
    service = new ListingsSearchService(prisma);
  });

  const whereOf = () => prisma.listing.findMany.mock.calls[0][0].where;

  it('filters by a single kind', async () => {
    await service.search({ kind: 'EXPERIENCE' } as any, 'en');
    expect(whereOf().kind).toBe('EXPERIENCE');
  });

  it('filters by multiple kinds with an IN clause', async () => {
    await service.search({ kind: 'STAY,SALE' } as any, 'en');
    expect(whereOf().kind).toEqual({ in: ['STAY', 'SALE'] });
  });

  it('omits the kind filter when not provided', async () => {
    await service.search({} as any, 'en');
    expect(whereOf().kind).toBeUndefined();
  });
});
