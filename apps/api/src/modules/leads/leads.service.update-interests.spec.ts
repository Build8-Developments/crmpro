import { SYSTEM_LEAD_SCOPE } from '../../common/auth';
import { Test, TestingModule } from '@nestjs/testing';
import { LeadActivityService } from './services/lead-activity.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { TaskLifecycleService } from '../workflow/common/task-lifecycle.service';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { mergeCustomFieldValues } from '../custom-fields/custom-field-values';
import { LeadsService } from './leads.service';

describe('LeadsService.updateLead project interests', () => {
  let service: LeadsService;
  let tx: {
    lead: { update: jest.Mock };
    leadProjectInterest: { deleteMany: jest.Mock; upsert: jest.Mock };
  };

  const existingLead = {
    id: 'lead-1',
    fullName: 'Jane Doe',
    primaryPhone: '01001112233',
    primaryPhoneNormalized: '+201001112233',
    secondaryPhone: null,
    secondaryPhoneNormalized: null,
    pipelineStage: {
      id: 'stage-1',
      name: 'New Lead',
      color: null,
      isClosed: false,
      closeType: null,
    },
    leadProjectInterests: [],
  };

  beforeEach(async () => {
    tx = {
      lead: { update: jest.fn() },
      leadProjectInterest: {
        deleteMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(existingLead),
        findMany: jest.fn().mockResolvedValue([]),
      },
      project: {
        findMany: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(where.id.in.map((id: string) => ({ id }))),
          ),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: CustomFieldsService,
          useValue: {
            getLeadDefinitions: jest.fn().mockResolvedValue([]),
            resolveLeadValues: mergeCustomFieldValues,
          },
        },
        { provide: PrismaService, useValue: prisma },
        {
          provide: LeadActivityService,
          useValue: { createActivity: jest.fn() },
        },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: TaskLifecycleService,
          useValue: { cancelOpenTasks: jest.fn().mockResolvedValue(0) },
        },
        { provide: QuotaService, useValue: {} },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  it('removes only interests that are no longer listed and upserts the rest', async () => {
    await service.updateLead(
      'lead-1',
      'tenant-1',
      {
        projectInterests: [
          { projectId: 'project-a', interestLevel: 'HOT' },
          { projectId: 'project-b' },
        ],
      },
      null,
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.leadProjectInterest.deleteMany).toHaveBeenCalledWith({
      where: {
        leadId: 'lead-1',
        projectId: { notIn: ['project-a', 'project-b'] },
      },
    });
    expect(tx.leadProjectInterest.upsert).toHaveBeenCalledTimes(2);
    expect(tx.leadProjectInterest.upsert).toHaveBeenCalledWith({
      where: {
        leadId_projectId: { leadId: 'lead-1', projectId: 'project-a' },
      },
      create: {
        leadId: 'lead-1',
        projectId: 'project-a',
        interestLevel: 'HOT',
      },
      update: { interestLevel: 'HOT' },
    });
  });

  it('clears all interests when an empty list is sent', async () => {
    await service.updateLead(
      'lead-1',
      'tenant-1',
      { projectInterests: [] },
      null,
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.leadProjectInterest.deleteMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1' },
    });
    expect(tx.leadProjectInterest.upsert).not.toHaveBeenCalled();
  });

  it('leaves interests untouched when projectInterests is omitted', async () => {
    await service.updateLead(
      'lead-1',
      'tenant-1',
      { fullName: 'Jane Smith' },
      null,
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.leadProjectInterest.deleteMany).not.toHaveBeenCalled();
    expect(tx.leadProjectInterest.upsert).not.toHaveBeenCalled();
  });
});
