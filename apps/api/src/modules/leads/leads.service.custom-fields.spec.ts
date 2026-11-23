import { BadRequestException } from '@nestjs/common';
import { CustomFieldType, Prisma } from '@crmpro/database';
import { Test, TestingModule } from '@nestjs/testing';
import { SYSTEM_LEAD_SCOPE } from '../../common/auth';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuotaService } from '../../common/quota/quota.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import type { CustomFieldDefinitionLike } from '../custom-fields/custom-field-values';
import { TaskLifecycleService } from '../workflow/common/task-lifecycle.service';
import { LeadsService } from './leads.service';
import { LeadActivityService } from './services/lead-activity.service';

const definitions: CustomFieldDefinitionLike[] = [
  {
    key: 'unit_type',
    label: 'Unit type',
    type: CustomFieldType.SELECT,
    options: ['Apartment', 'Villa'],
    isRequired: true,
    archivedAt: null,
  },
  {
    key: 'bedrooms',
    label: 'Bedrooms',
    type: CustomFieldType.NUMBER,
    options: null,
    isRequired: false,
    archivedAt: null,
  },
  {
    key: 'old_code',
    label: 'Old code',
    type: CustomFieldType.TEXT,
    options: null,
    isRequired: false,
    archivedAt: new Date('2026-11-01'),
  },
];

describe('LeadsService custom fields', () => {
  let service: LeadsService;
  let tx: {
    lead: { create: jest.Mock; update: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let customFields: { getLeadDefinitions: jest.Mock };

  const existingLead = {
    id: 'lead-1',
    fullName: 'Jane Doe',
    primaryPhone: '01001112233',
    primaryPhoneNormalized: '+201001112233',
    secondaryPhone: null,
    secondaryPhoneNormalized: null,
    customFields: { unit_type: 'Villa' },
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
      lead: {
        create: jest.fn().mockResolvedValue({ id: 'lead-1' }),
        update: jest.fn(),
      },
      // The row as locked inside the transaction.
      $queryRaw: jest.fn().mockResolvedValue([
        {
          customFields: {
            unit_type: 'Villa',
            old_code: 'A-17',
            preferredUnit: 'Corner unit',
          },
        },
      ]),
    };
    customFields = {
      getLeadDefinitions: jest.fn().mockResolvedValue(definitions),
    };

    const prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(existingLead),
        findMany: jest.fn().mockResolvedValue([]),
      },
      pipelineStage: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'stage-1', isClosed: false }),
      },
      pipeline: { findFirst: jest.fn().mockResolvedValue({ id: 'p-1' }) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CustomFieldsService,
          useFactory: () => {
            const real = new CustomFieldsService({} as never, {} as never);
            return {
              getLeadDefinitions: customFields.getLeadDefinitions,
              resolveLeadValues: real.resolveLeadValues.bind(real),
            };
          },
        },
        {
          provide: LeadActivityService,
          useValue: { createActivity: jest.fn() },
        },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: TaskLifecycleService,
          useValue: { cancelOpenTasks: jest.fn().mockResolvedValue(0) },
        },
        {
          provide: QuotaService,
          useValue: { assertCanCreateLeadInTransaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  it('rejects a new lead that misses a required custom field', async () => {
    await expect(
      service.createLead(
        'tenant-1',
        'user-1',
        {
          fullName: 'Jane Doe',
          primaryPhone: '01001112233',
          pipelineId: 'p-1',
          pipelineStageId: 'stage-1',
          customFields: { bedrooms: 2 },
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.lead.create).not.toHaveBeenCalled();
  });

  it('stores coerced values on create', async () => {
    await service.createLead(
      'tenant-1',
      'user-1',
      {
        fullName: 'Jane Doe',
        primaryPhone: '01001112233',
        pipelineId: 'p-1',
        pipelineStageId: 'stage-1',
        customFields: { unit_type: 'Apartment', bedrooms: '3' },
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customFields: { unit_type: 'Apartment', bedrooms: 3 },
        }),
      }),
    );
  });

  it('merges an edit into the locked row, keeping archived and unknown keys', async () => {
    await service.updateLead(
      'lead-1',
      'tenant-1',
      { customFields: { bedrooms: 4 } },
      'user-1',
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: expect.objectContaining({
        customFields: {
          unit_type: 'Villa',
          old_code: 'A-17',
          preferredUnit: 'Corner unit',
          bedrooms: 4,
        },
      }),
    });
  });

  it('clears the column when the last value is removed', async () => {
    tx.$queryRaw.mockResolvedValue([{ customFields: { bedrooms: 2 } }]);
    customFields.getLeadDefinitions.mockResolvedValue(
      definitions.filter((definition) => !definition.isRequired),
    );

    await service.updateLead(
      'lead-1',
      'tenant-1',
      { customFields: { bedrooms: null } },
      'user-1',
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: expect.objectContaining({ customFields: Prisma.DbNull }),
    });
  });

  it('refuses to write an archived field', async () => {
    await expect(
      service.updateLead(
        'lead-1',
        'tenant-1',
        { customFields: { old_code: 'B-2' } },
        'user-1',
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.lead.update).not.toHaveBeenCalled();
  });

  it('leaves custom fields alone when the edit does not send them', async () => {
    await service.updateLead(
      'lead-1',
      'tenant-1',
      { fullName: 'Jane Smith' },
      'user-1',
      SYSTEM_LEAD_SCOPE,
    );

    expect(customFields.getLeadDefinitions).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.lead.update.mock.calls[0][0].data).not.toHaveProperty(
      'customFields',
    );
  });
});
