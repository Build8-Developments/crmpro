import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAX_VIEWS_PER_USER = 30;

const viewSelect = {
  id: true,
  name: true,
  filters: true,
  sort: true,
  isShared: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.SavedViewSelect;

export interface SavedViewInput {
  name?: string;
  filters?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  isShared?: boolean;
}

/**
 * Saved lead views. A view only stores filter values — results are always
 * computed by the leads API under the *viewer's* scope, so sharing a view
 * never shares data someone couldn't already see.
 */
@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId: string) {
    const items = await this.prisma.savedView.findMany({
      where: { tenantId, OR: [{ userId }, { isShared: true }] },
      orderBy: [{ isShared: 'asc' }, { name: 'asc' }],
      select: viewSelect,
    });

    return {
      items: items.map((view) => ({ ...view, isOwn: view.user.id === userId })),
    };
  }

  async create(
    tenantId: string,
    userId: string,
    input: Required<Pick<SavedViewInput, 'name'>> & SavedViewInput,
    canShare: boolean,
  ) {
    if (input.isShared && !canShare) {
      throw new ForbiddenException('You cannot share views');
    }

    const count = await this.prisma.savedView.count({
      where: { tenantId, userId },
    });
    if (count >= MAX_VIEWS_PER_USER) {
      throw new ForbiddenException(
        `You can save up to ${MAX_VIEWS_PER_USER} views`,
      );
    }

    const view = await this.prisma.savedView.create({
      data: {
        tenantId,
        userId,
        name: input.name,
        filters: (input.filters ?? {}) as Prisma.InputJsonValue,
        sort: (input.sort ?? {}) as Prisma.InputJsonValue,
        isShared: input.isShared ?? false,
      },
      select: viewSelect,
    });

    return { ...view, isOwn: true };
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    input: SavedViewInput,
    canShare: boolean,
  ) {
    await this.getOwnOrThrow(tenantId, userId, id);

    if (input.isShared && !canShare) {
      throw new ForbiddenException('You cannot share views');
    }

    const view = await this.prisma.savedView.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.filters !== undefined
          ? { filters: input.filters as Prisma.InputJsonValue }
          : {}),
        ...(input.sort !== undefined
          ? { sort: input.sort as Prisma.InputJsonValue }
          : {}),
        ...(input.isShared !== undefined ? { isShared: input.isShared } : {}),
      },
      select: viewSelect,
    });

    return { ...view, isOwn: true };
  }

  async remove(tenantId: string, userId: string, id: string) {
    await this.getOwnOrThrow(tenantId, userId, id);
    await this.prisma.savedView.delete({ where: { id } });
    return { id };
  }

  /** Only the creator edits or deletes a view. */
  private async getOwnOrThrow(tenantId: string, userId: string, id: string) {
    const view = await this.prisma.savedView.findFirst({
      where: { id, tenantId, userId },
      select: { id: true },
    });

    if (!view) {
      throw new NotFoundException('View not found');
    }

    return view;
  }
}
