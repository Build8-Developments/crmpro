import { Prisma } from '@crmpro/database';
import { LeadsService } from './leads.service';

const pipeline = { pipelineId: 'pipeline-1', pipelineStageId: 'stage-1' };

function build(options: { txError?: Error; duplicate?: boolean } = {}) {
  const tx = {
    lead: { create: jest.fn().mockResolvedValue({ id: 'lead-1' }) },
    leadProjectInterest: { createMany: jest.fn() },
    leadNote: { create: jest.fn() },
  };
  const prisma = {
    lead: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          options.duplicate
            ? [{ id: 'lead-0', fullName: 'Old', assignedUserId: null }]
            : [],
        ),
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'lead-earlier', assignedUserId: 'agent-1' }),
    },
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    leadSource: { findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => {
      if (options.txError) throw options.txError;
      return callback(tx);
    }),
  };
  const service = new LeadsService(
    prisma as never,
    { createActivity: jest.fn() } as never,
    { publish: jest.fn() } as never,
    { canCreateLeadInTransaction: jest.fn().mockResolvedValue(true) } as never,
    { createAuditLog: jest.fn() } as never,
    { resolveLeadValues: jest.fn() } as never,
  );
  return { service, prisma, tx };
}

describe('LeadsService.createLeadFromImport', () => {
  it('writes projects, budget, notes, custom fields and the row marker', async () => {
    const { service, tx } = build();

    const result = await service.createLeadFromImport(
      'tenant-1',
      'user-1',
      'job-1',
      {
        fullName: 'Mona Hassan',
        primaryPhone: '01011111111',
        projectIds: ['p-1', 'p-1'],
        budgetMin: 1_000_000,
        notes: 'Wants a villa',
        customFields: { unit_type: 'Villa' },
        importRowNumber: 7,
      },
      pipeline,
    );

    expect(result).toEqual({
      success: true,
      leadId: 'lead-1',
      assignedUserId: null,
    });
    expect(tx.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budgetMin: 1_000_000,
          customFields: { unit_type: 'Villa' },
          importJobId: 'job-1',
          importRowNumber: 7,
        }) as unknown,
      }),
    );
    expect(tx.leadProjectInterest.createMany).toHaveBeenCalledWith({
      data: [{ leadId: 'lead-1', projectId: 'p-1' }],
      skipDuplicates: true,
    });
    expect(tx.leadNote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: 'Wants a villa' }) as unknown,
    });
  });

  it('reports duplicates unless the policy allows them', async () => {
    const { service } = build({ duplicate: true });
    const row = { fullName: 'Mona Hassan', primaryPhone: '01011111111' };

    await expect(
      service.createLeadFromImport(
        'tenant-1',
        'user-1',
        'job-1',
        row,
        pipeline,
      ),
    ).resolves.toEqual({
      success: false,
      reason: 'Duplicate of an existing lead',
      duplicate: true,
    });

    await expect(
      service.createLeadFromImport(
        'tenant-1',
        'user-1',
        'job-1',
        { ...row, allowDuplicates: true },
        pipeline,
      ),
    ).resolves.toMatchObject({ success: true });
  });

  it('treats a unique clash on the row marker as already imported', async () => {
    const { service } = build({
      txError: new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    });

    await expect(
      service.createLeadFromImport(
        'tenant-1',
        'user-1',
        'job-1',
        {
          fullName: 'Mona Hassan',
          primaryPhone: '01011111111',
          importRowNumber: 3,
        },
        pipeline,
      ),
    ).resolves.toEqual({
      success: true,
      leadId: 'lead-earlier',
      assignedUserId: 'agent-1',
      alreadyImported: true,
    });
  });
});
