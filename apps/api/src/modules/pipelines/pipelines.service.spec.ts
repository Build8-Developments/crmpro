import { PipelinesService } from './pipelines.service';

function stageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stage-1',
    name: 'Negotiation',
    sortOrder: 2,
    color: null,
    icon: null,
    isSystem: false,
    isClosed: false,
    closeType: null,
    staleAfterDays: 5,
    stuckAfterDays: 21,
    pipelineId: 'pipeline-1',
    tenantId: 't',
    ...overrides,
  };
}

function build() {
  const tx = {
    pipelineStage: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(stageRow({ id: 'new', ...data })),
      ),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(stageRow(data)),
      ),
      count: jest.fn().mockResolvedValue(3),
    },
  };
  const prisma = {
    pipeline: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'pipeline-1',
        tenantId: 't',
        stages: [stageRow()],
      }),
    },
    pipelineStage: {
      findFirst: jest.fn().mockResolvedValue(stageRow()),
      count: jest.fn().mockResolvedValue(3),
    },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new PipelinesService(
    prisma as never,
    { publish: jest.fn() } as never,
  );
  return { service, prisma, tx };
}

describe('PipelinesService — stage thresholds (R8/R9)', () => {
  it('defaults a new open stage to revive after 7 days, no stuck review', async () => {
    const { service, tx } = build();

    const stage = await service.createStage('pipeline-1', 't', {
      name: 'Site visit',
      sortOrder: 2,
    });

    expect(tx.pipelineStage.create.mock.calls[0][0].data).toMatchObject({
      staleAfterDays: 7,
      stuckAfterDays: null,
    });
    expect(stage).toMatchObject({ staleAfterDays: 7, stuckAfterDays: null });
  });

  it('keeps explicit values, null turns a rule off', async () => {
    const { service, tx } = build();

    await service.createStage('pipeline-1', 't', {
      name: 'Site visit',
      sortOrder: 2,
      staleAfterDays: null,
      stuckAfterDays: 10,
    });

    expect(tx.pipelineStage.create.mock.calls[0][0].data).toMatchObject({
      staleAfterDays: null,
      stuckAfterDays: 10,
    });
  });

  it('refuses thresholds on a closed stage', async () => {
    const { service } = build();

    await expect(
      service.createStage('pipeline-1', 't', {
        name: 'Won again',
        sortOrder: 2,
        isClosed: true,
        closeType: 'WON',
        staleAfterDays: 3,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('updates thresholds and leaves the other one alone', async () => {
    const { service, tx } = build();

    const stage = await service.updateStage('pipeline-1', 'stage-1', 't', {
      stuckAfterDays: null,
    });

    expect(tx.pipelineStage.update.mock.calls[0][0].data).toMatchObject({
      staleAfterDays: 5,
      stuckAfterDays: null,
    });
    expect(stage).toMatchObject({ staleAfterDays: 5, stuckAfterDays: null });
  });

  it('clears both thresholds when a stage becomes closed', async () => {
    const { service, tx } = build();

    await service.updateStage('pipeline-1', 'stage-1', 't', {
      isClosed: true,
      closeType: 'LOST',
    });

    expect(tx.pipelineStage.update.mock.calls[0][0].data).toMatchObject({
      isClosed: true,
      staleAfterDays: null,
      stuckAfterDays: null,
    });
  });
});
