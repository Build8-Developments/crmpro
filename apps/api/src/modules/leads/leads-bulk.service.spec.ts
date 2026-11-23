import { SYSTEM_LEAD_SCOPE } from '../../common/auth';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { AuditWriterService } from '../audit/audit-writer.service';
import { AUDIT_ENTITY_TYPES } from '../audit/audit.constants';
import {
  BULK_LEAD_ACTION_TYPES,
  BULK_LEAD_AUDIT_ACTIONS,
  BULK_ACTION_VALIDATION_MESSAGE,
  MAX_BULK_ACTION_SIZE,
  MAX_BULK_MATCHING,
} from './constants/leads-bulk.constants';
import { BulkAssignLeadsDto } from './dto/bulk-assign-leads.dto';
import { LeadsBulkService } from './leads-bulk.service';
import { LeadsService } from './leads.service';
import { LeadWorkloadService } from './services/lead-workload.service';

const candidate = (id: string, heat: 'HOT' | 'WARM' | 'COLD') => ({
  id,
  heat,
  nextTaskDueAt: null,
  stage: { id: 's1', name: 'New Lead', color: null, icon: null },
  openTaskCount: 1,
});
const load = (userId: string, openLeads: number) => ({
  userId,
  name: userId,
  role: null,
  openLeads,
  hotLeads: 0,
  overdue: 0,
  noNextStep: 0,
  openTasks: 0,
  wonLast30Days: 0,
});
import { LeadAssignmentService } from './services/lead-assignment.service';
import { LeadStageService } from './services/lead-stage.service';

describe('LeadsBulkService', () => {
  let service: LeadsBulkService;
  let leadAssignmentService: { assignLead: jest.Mock };
  let auditWriter: { createAuditLog: jest.Mock };
  let leadsService: {
    findMatchingLeadIds: jest.Mock;
    getTransferCandidates: jest.Mock;
  };
  let workload: { getWorkload: jest.Mock };
  let leadStageService: {
    moveStage: jest.Mock;
    assertBulkTargetAllowed: jest.Mock;
  };

  beforeEach(async () => {
    leadStageService = {
      moveStage: jest.fn().mockResolvedValue({}),
      assertBulkTargetAllowed: jest.fn().mockResolvedValue(undefined),
    };
    leadAssignmentService = {
      assignLead: jest.fn(),
    };
    auditWriter = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    };
    leadsService = {
      findMatchingLeadIds: jest.fn(),
      getTransferCandidates: jest.fn(),
    };
    workload = { getWorkload: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsBulkService,
        { provide: LeadAssignmentService, useValue: leadAssignmentService },
        { provide: LeadStageService, useValue: leadStageService },
        { provide: AuditWriterService, useValue: auditWriter },
        { provide: LeadsService, useValue: leadsService },
        { provide: LeadWorkloadService, useValue: workload },
      ],
    }).compile();

    service = module.get(LeadsBulkService);
  });

  it('deduplicates lead IDs before processing', async () => {
    leadAssignmentService.assignLead.mockResolvedValue({});

    const result = await service.bulkAssignLeads(
      'tenant-1',
      'actor-1',
      {
        leadIds: ['lead-a', 'lead-a', 'lead-b'],
        userId: 'user-1',
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(leadAssignmentService.assignLead).toHaveBeenCalledTimes(2);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
    expect(auditWriter.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ leadCount: 2 }),
      }),
    );
  });

  it('refuses a bulk win before touching any lead', async () => {
    leadStageService.assertBulkTargetAllowed.mockRejectedValue(
      new BadRequestException(
        'Win leads one at a time so each deal is recorded.',
      ),
    );

    await expect(
      service.bulkMoveStage(
        'tenant-1',
        'actor-1',
        { leadIds: ['lead-1', 'lead-2'], targetStageId: 'stage-won' },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toThrow('Win leads one at a time');
    expect(leadStageService.moveStage).not.toHaveBeenCalled();
    expect(auditWriter.createAuditLog).not.toHaveBeenCalled();
  });

  it('still moves leads to Lost in bulk with the reason', async () => {
    const result = await service.bulkMoveStage(
      'tenant-1',
      'actor-1',
      {
        leadIds: ['lead-1', 'lead-2'],
        targetStageId: 'stage-lost',
        lostReasonId: 'reason-1',
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(leadStageService.assertBulkTargetAllowed).toHaveBeenCalledWith(
      'tenant-1',
      'stage-lost',
    );
    expect(leadStageService.moveStage).toHaveBeenCalledTimes(2);
    expect(leadStageService.moveStage).toHaveBeenCalledWith(
      'lead-1',
      'tenant-1',
      'actor-1',
      expect.objectContaining({ lostReasonId: 'reason-1' }),
      SYSTEM_LEAD_SCOPE,
    );
    expect(result.successCount).toBe(2);
  });

  it('returns partial success when some leads fail', async () => {
    leadAssignmentService.assignLead
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        new BadRequestException('Archived leads cannot be assigned'),
      );

    const result = await service.bulkAssignLeads(
      'tenant-1',
      'actor-1',
      {
        leadIds: ['lead-1', 'lead-2', 'lead-3'],
        userId: 'user-1',
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(result).toEqual({
      successCount: 2,
      failureCount: 1,
      failures: [
        {
          leadId: 'lead-3',
          reason: 'Archived leads cannot be assigned',
        },
      ],
    });
  });

  it('writes a single bulk assign audit log', async () => {
    leadAssignmentService.assignLead.mockResolvedValue({});

    await service.bulkAssignLeads(
      'tenant-1',
      'actor-1',
      {
        leadIds: ['lead-1'],
        userId: 'user-1',
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(auditWriter.createAuditLog).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorUserId: 'actor-1',
      action: BULK_LEAD_AUDIT_ACTIONS.ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.LEAD_BULK_ACTION,
      metadata: {
        actionType: BULK_LEAD_ACTION_TYPES.ASSIGN,
        targetUserId: 'user-1',
        selection: 'IDS',
        leadCount: 1,
        successCount: 1,
        failureCount: 0,
      },
    });
  });

  it('assigns every lead matching the filters', async () => {
    leadAssignmentService.assignLead.mockResolvedValue({});
    leadsService.findMatchingLeadIds.mockResolvedValue(['lead-1', 'lead-2']);

    const result = await service.bulkAssignLeads(
      'tenant-1',
      'actor-1',
      {
        filters: { assignees: ['unassigned'], heat: ['HOT'] },
        userId: 'user-1',
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(leadsService.findMatchingLeadIds).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ assignees: ['unassigned'], heat: ['HOT'] }),
      MAX_BULK_MATCHING,
      SYSTEM_LEAD_SCOPE,
    );
    expect(leadAssignmentService.assignLead).toHaveBeenCalledTimes(2);
    expect(result.successCount).toBe(2);
  });

  it('rejects a selection that has both ids and filters', async () => {
    await expect(
      service.bulkAssignLeads(
        'tenant-1',
        'actor-1',
        {
          leadIds: ['lead-1'],
          filters: {},
          userId: 'user-1',
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toThrow('either leadIds or filters');
  });

  it('splits a transfer evenly and spreads hot leads first', async () => {
    leadAssignmentService.assignLead.mockResolvedValue({});
    leadsService.findMatchingLeadIds.mockResolvedValue([
      'l1',
      'l2',
      'l3',
      'l4',
    ]);
    leadsService.getTransferCandidates.mockResolvedValue([
      candidate('l1', 'COLD'),
      candidate('l2', 'HOT'),
      candidate('l3', 'WARM'),
      candidate('l4', 'HOT'),
    ]);
    workload.getWorkload.mockResolvedValue([
      load('user-a', 10),
      load('user-b', 0),
      load('user-c', 5),
    ]);

    const result = await service.bulkTransferLeads(
      'tenant-1',
      'actor-1',
      {
        fromUserId: 'user-a',
        toUserIds: ['user-b', 'user-c'],
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(leadsService.findMatchingLeadIds).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        assignees: ['user-a'],
        status: 'OPEN',
        openOnly: true,
      }),
      MAX_BULK_MATCHING,
      SYSTEM_LEAD_SCOPE,
    );
    // HOT l2 → b, HOT l4 → c, WARM l3 → b, COLD l1 → c
    expect(result.allocations).toEqual([
      expect.objectContaining({ userId: 'user-b', leadCount: 2 }),
      expect.objectContaining({ userId: 'user-c', leadCount: 2 }),
    ]);
    expect(leadAssignmentService.assignLead).toHaveBeenCalledWith(
      'l2',
      'tenant-1',
      'actor-1',
      {
        userId: 'user-b',
      },
      SYSTEM_LEAD_SCOPE,
    );
    expect(leadAssignmentService.assignLead).toHaveBeenCalledWith(
      'l4',
      'tenant-1',
      'actor-1',
      {
        userId: 'user-c',
      },
      SYSTEM_LEAD_SCOPE,
    );
  });

  it('balances a transfer towards the least loaded person', async () => {
    leadsService.findMatchingLeadIds.mockResolvedValue(['l1', 'l2', 'l3']);
    leadsService.getTransferCandidates.mockResolvedValue([
      candidate('l1', 'WARM'),
      candidate('l2', 'WARM'),
      candidate('l3', 'WARM'),
    ]);
    workload.getWorkload.mockResolvedValue([
      load('user-a', 3),
      load('user-b', 0),
      load('user-c', 2),
    ]);

    const preview = await service.previewTransfer(
      'tenant-1',
      {
        fromUserId: 'user-a',
        toUserIds: ['user-b', 'user-c'],
        distribution: 'BALANCE',
      },
      SYSTEM_LEAD_SCOPE,
    );

    // b starts empty: l1, l2 bring it level with c (2); ties go to the first listed.
    expect(preview.allocations.map((a) => a.leadCount)).toEqual([3, 0]);
    expect(preview.leadCount).toBe(3);
    expect(leadAssignmentService.assignLead).not.toHaveBeenCalled();
  });

  it('refuses to transfer to the same person', async () => {
    await expect(
      service.bulkTransferLeads(
        'tenant-1',
        'actor-1',
        {
          fromUserId: 'user-a',
          toUserIds: ['user-a'],
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toThrow('two different people');
  });
});

describe('BulkAssignLeadsDto validation', () => {
  it('rejects batches above the max size', async () => {
    const dto = new BulkAssignLeadsDto();
    dto.leadIds = Array.from(
      { length: MAX_BULK_ACTION_SIZE + 1 },
      (_, index) =>
        `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    );
    dto.userId = '22222222-2222-4222-8222-222222222201';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'leadIds')).toBe(true);
    expect(
      errors.find((error) => error.property === 'leadIds')?.constraints,
    ).toEqual(
      expect.objectContaining({
        arrayMaxSize: BULK_ACTION_VALIDATION_MESSAGE,
      }),
    );
  });
});
