import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { QUOTA_EXCEEDED_MESSAGES } from './quota.constants';
import { QuotaService } from './quota.service';

describe('QuotaService', () => {
  let service: QuotaService;
  let prisma: {
    tenant: { findFirst: jest.Mock };
    lead: { count: jest.Mock };
    project: { count: jest.Mock };
    user: { count: jest.Mock };
  };

  const starterPlan = {
    maxUsers: 5,
    maxLeads: 2,
    maxProjects: 10,
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({
          subscriptionPlan: starterPlan,
        }),
      },
      lead: { count: jest.fn() },
      project: { count: jest.fn() },
      user: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(QuotaService);
  });

  describe('assertCanCreateLead', () => {
    it('allows creation when below Starter lead limit', async () => {
      prisma.lead.count.mockResolvedValue(1);

      await expect(service.assertCanCreateLead('tenant-1')).resolves.toBeUndefined();
    });

    it('rejects creation when at Starter lead limit', async () => {
      prisma.lead.count.mockResolvedValue(2);

      await expect(service.assertCanCreateLead('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.LEAD),
      );
    });

    it('allows unlimited leads when plan limit is null', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        subscriptionPlan: { ...starterPlan, maxLeads: null },
      });
      prisma.lead.count.mockResolvedValue(1_000_000);

      await expect(service.assertCanCreateLead('tenant-1')).resolves.toBeUndefined();
    });
  });

  describe('canCreateLead', () => {
    it('returns false when quota exceeded', async () => {
      prisma.lead.count.mockResolvedValue(2);

      await expect(service.canCreateLead('tenant-1')).resolves.toBe(false);
    });
  });

  describe('assertCanCreateProject', () => {
    it('rejects creation when at project limit', async () => {
      prisma.project.count.mockResolvedValue(10);

      await expect(service.assertCanCreateProject('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.PROJECT),
      );
    });
  });

  describe('assertCanCreateUser', () => {
    it('rejects creation when at user limit', async () => {
      prisma.user.count.mockResolvedValue(5);

      await expect(service.assertCanCreateUser('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.USER),
      );
    });
  });

  it('throws when tenant is not found', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    await expect(service.assertCanCreateLead('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
