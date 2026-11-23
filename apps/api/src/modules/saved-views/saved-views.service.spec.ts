import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { SavedViewsService } from './saved-views.service';

const AGENT = '11111111-1111-4111-8111-111111111111';

function build() {
  const prisma = {
    savedView: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'view-1',
          ...data,
          user: { id: data.userId, name: 'Me' },
        }),
      ),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { service: new SavedViewsService(prisma as never), prisma };
}

describe('SavedViewsService', () => {
  it('keeps valid lead filters, sort and display, and drops the open-lead id', async () => {
    const { service, prisma } = build();
    await service.create(
      't',
      'u',
      {
        name: 'Hot, no next step',
        filters: {
          heat: ['HOT'],
          nextStep: 'none',
          assignees: [AGENT, 'unassigned'],
          budgetMin: 2_000_000,
          id: AGENT,
          stageIds: [],
        },
        sort: { sortBy: 'nextTaskDueAt', sortOrder: 'asc' },
        display: {
          layout: 'board',
          density: 'compact',
          columns: { email: false },
        },
      },
      false,
    );

    expect(prisma.savedView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          filters: {
            heat: ['HOT'],
            nextStep: 'none',
            assignees: [AGENT, 'unassigned'],
            budgetMin: 2_000_000,
          },
          sort: { sortBy: 'nextTaskDueAt', sortOrder: 'asc' },
          display: {
            layout: 'board',
            density: 'compact',
            columns: { email: false },
          },
          isShared: false,
        }),
      }),
    );
  });

  it.each([
    ['an unknown filter', { filters: { hacked: true } }],
    ['an invalid filter value', { filters: { heat: ['LAVA'] } }],
    ['an unknown sort field', { sort: { sortBy: 'password' } }],
    ['an unknown layout', { display: { layout: 'gantt' } }],
    ['bad column ids', { display: { columns: { 'x"; drop': true } } }],
  ])('rejects %s', async (_label, extra) => {
    const { service } = build();
    await expect(
      service.create('t', 'u', { name: 'View', ...extra }, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects views that are too large', async () => {
    const { service } = build();
    await expect(
      service.create(
        't',
        'u',
        { name: 'View', filters: { residenceArea: 'x'.repeat(10_000) } },
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only lets managers share', async () => {
    const { service } = build();
    await expect(
      service.create('t', 'u', { name: 'Team view', isShared: true }, false),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports a duplicate name clearly', async () => {
    const { service, prisma } = build();
    prisma.savedView.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.create('t', 'u', { name: 'Mine' }, false),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("does not let anyone edit someone else's view", async () => {
    const { service, prisma } = build();
    prisma.savedView.findFirst.mockResolvedValue(null);
    await expect(
      service.update(
        't',
        'u',
        'view-of-someone-else',
        { name: 'Mine now' },
        true,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.savedView.update).not.toHaveBeenCalled();
  });
});
