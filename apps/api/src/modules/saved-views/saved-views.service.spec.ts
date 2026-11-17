import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SavedViewsService } from './saved-views.service';

describe('SavedViewsService', () => {
  let prisma: {
    savedView: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: SavedViewsService;

  beforeEach(() => {
    prisma = {
      savedView: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'v1', user: { id: 'user-1', name: 'U' } }),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new SavedViewsService(prisma as never);
  });

  it('lists own views and shared views of the tenant only', async () => {
    await service.list('tenant-1', 'user-1');

    expect(prisma.savedView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          OR: [{ userId: 'user-1' }, { isShared: true }],
        },
      }),
    );
  });

  it('requires saved-view.share to share', async () => {
    await expect(
      service.create(
        'tenant-1',
        'user-1',
        { name: 'Hot', isShared: true },
        false,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.create(
        'tenant-1',
        'user-1',
        { name: 'Hot', isShared: true },
        true,
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'v1', isOwn: true }));
  });

  it("never edits or deletes someone else's view", async () => {
    prisma.savedView.findFirst.mockResolvedValue(null);

    await expect(
      service.remove('tenant-1', 'user-1', 'v-other'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.savedView.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v-other', tenantId: 'tenant-1', userId: 'user-1' },
      }),
    );
    expect(prisma.savedView.delete).not.toHaveBeenCalled();
  });
});
