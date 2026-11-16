import { Test, TestingModule } from '@nestjs/testing';
import { LeadActivityService } from './services/lead-activity.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadsService } from './leads.service';

describe('LeadsService.buildLeadsWhereInput', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: {} },
        { provide: LeadActivityService, useValue: {} },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        { provide: QuotaService, useValue: {} },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  it('keeps both the stale and the search conditions when combined', () => {
    const where = service.buildLeadsWhereInput('tenant-1', {
      staleOnly: true,
      search: 'ahmed',
    });

    expect(where.OR).toBeUndefined();
    expect(where.AND).toHaveLength(2);
    const [stale, search] = where.AND as Array<Record<string, unknown>>;
    expect(stale.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lastContactedAt: null }),
      ]),
    );
    expect(search.OR).toEqual(
      expect.arrayContaining([
        { fullName: { contains: 'ahmed', mode: 'insensitive' } },
      ]),
    );
  });

  it('matches phone searches against normalized columns', () => {
    const where = service.buildLeadsWhereInput('tenant-1', {
      search: '0100 123',
    });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { primaryPhoneNormalized: { contains: '100123' } },
        { secondaryPhoneNormalized: { contains: '100123' } },
      ]),
    );
  });
});
