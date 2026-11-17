import { ContractStatus } from '@crmpro/database';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  it('prefers the active contract snapshot for limits and features', async () => {
    const prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({
          name: 'Prime',
          status: 'ACTIVE',
          storageUsedBytes: 1024n,
          subscriptionPlan: {
            name: 'Growth (live)',
            defaultPrice: null,
            currency: 'EGP',
            maxUsers: 99,
            maxLeads: 99,
            maxProjects: 99,
            maxStorageBytes: null,
            featureFlags: { analytics: false },
          },
          contracts: [
            {
              contractName: 'Annual',
              status: ContractStatus.ACTIVE,
              agreedPrice: { toString: () => '12000' },
              currency: 'EGP',
              paymentMethod: 'INSTAPAY',
              paymentFrequency: 'YEARLY',
              contractStartAt: new Date('2026-01-01'),
              contractEndAt: null,
              gracePeriodDays: 7,
              autoRenew: true,
              planSnapshot: {
                planId: 'p1',
                name: 'Growth',
                price: 1000,
                currency: 'EGP',
                quotas: {
                  maxUsers: 10,
                  maxLeads: 5000,
                  maxProjects: 50,
                  maxStorageBytes: '1073741824',
                },
                featureFlags: { analytics: true },
                capturedAt: '2026-01-01T00:00:00.000Z',
              },
            },
          ],
        }),
      },
      user: { count: jest.fn().mockResolvedValue(4) },
      lead: { count: jest.fn().mockResolvedValue(120) },
      project: { count: jest.fn().mockResolvedValue(3) },
    };

    const overview = await new BillingService(prisma as never).getOverview(
      'tenant-1',
    );

    expect(overview.plan).toEqual({
      name: 'Growth',
      price: 1000,
      currency: 'EGP',
      features: { analytics: true },
    });
    expect(overview.usage.users).toEqual({ used: 4, limit: 10 });
    expect(overview.usage.storageBytes).toEqual({
      used: '1024',
      limit: '1073741824',
    });
    expect(overview.contract?.paymentMethod).toBe('INSTAPAY');
  });
});
