import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadFiltersDto } from '../leads/dto/get-leads-query.dto';
import { LEAD_SORT_FIELDS } from '../leads/leads.service';
import type {
  CreateSavedViewDto,
  UpdateSavedViewDto,
} from './dto/saved-view.dto';

export const MAX_VIEWS_PER_USER = 30;
/** Filters + sort + display, serialized. Plenty for any real view. */
const MAX_VIEW_BYTES = 8 * 1024;
const MAX_COLUMNS = 60;
const COLUMN_ID = /^[A-Za-z][\w-]{0,40}$/;
/** Never saved: a view describes a list, not one open lead. */
const TRANSIENT_FILTERS = ['id'];

const viewSelect = {
  id: true,
  tableKey: true,
  name: true,
  filters: true,
  sort: true,
  display: true,
  isShared: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.SavedViewSelect;

type ViewRecord = Prisma.SavedViewGetPayload<{ select: typeof viewSelect }>;

export interface SavedViewResponse extends Omit<ViewRecord, 'user'> {
  owner: { id: string; name: string };
  isOwn: boolean;
}

/**
 * Saved lead views. A view only stores settings — results are always computed
 * by the leads API under the *viewer's* visibility, so a shared view never
 * shows anyone data they couldn't already see.
 */
@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId: string, tableKey = 'leads') {
    const views = await this.prisma.savedView.findMany({
      where: { tenantId, tableKey, OR: [{ userId }, { isShared: true }] },
      orderBy: [{ name: 'asc' }],
      select: viewSelect,
    });
    // Mine first, then the team's.
    const items = views
      .map((view) => this.toResponse(view, userId))
      .sort((a, b) => Number(b.isOwn) - Number(a.isOwn));
    return { items };
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateSavedViewDto,
    canShare: boolean,
  ): Promise<SavedViewResponse> {
    if (dto.isShared && !canShare) {
      throw new ForbiddenException('Only managers can share views');
    }
    const content = this.normalize(dto);

    const count = await this.prisma.savedView.count({
      where: { tenantId, userId, tableKey: 'leads' },
    });
    if (count >= MAX_VIEWS_PER_USER) {
      throw new BadRequestException(
        `You can save up to ${MAX_VIEWS_PER_USER} views. Delete one first.`,
      );
    }

    try {
      const view = await this.prisma.savedView.create({
        data: {
          tenantId,
          userId,
          tableKey: 'leads',
          name: dto.name,
          filters: content.filters as Prisma.InputJsonValue,
          sort: content.sort,
          display: content.display as Prisma.InputJsonValue,
          isShared: dto.isShared ?? false,
        },
        select: viewSelect,
      });
      return this.toResponse(view, userId);
    } catch (error) {
      throw this.mapUniqueName(error);
    }
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateSavedViewDto,
    canShare: boolean,
  ): Promise<SavedViewResponse> {
    await this.getOwnOrThrow(tenantId, userId, id);
    if (dto.isShared && !canShare) {
      throw new ForbiddenException('Only managers can share views');
    }
    const content = this.normalize(dto);

    try {
      const view = await this.prisma.savedView.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.filters !== undefined
            ? { filters: content.filters as Prisma.InputJsonValue }
            : {}),
          ...(dto.sort !== undefined ? { sort: content.sort } : {}),
          ...(dto.display !== undefined
            ? { display: content.display as Prisma.InputJsonValue }
            : {}),
          ...(dto.isShared !== undefined ? { isShared: dto.isShared } : {}),
        },
        select: viewSelect,
      });
      return this.toResponse(view, userId);
    } catch (error) {
      throw this.mapUniqueName(error);
    }
  }

  async remove(tenantId: string, userId: string, id: string) {
    await this.getOwnOrThrow(tenantId, userId, id);
    await this.prisma.savedView.delete({ where: { id } });
    return { id };
  }

  /** Validates and cleans what a view stores; rejects anything unknown. */
  normalize(dto: CreateSavedViewDto | UpdateSavedViewDto) {
    const filters = Object.fromEntries(
      Object.entries(dto.filters ?? {}).filter(
        ([key, value]) =>
          !TRANSIENT_FILTERS.includes(key) &&
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !(Array.isArray(value) && value.length === 0),
      ),
    );
    const errors = validateSync(plainToInstance(LeadFiltersDto, filters), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      const fields = errors.map((error) => error.property).join(', ');
      throw new BadRequestException(`Invalid view filters: ${fields}`);
    }

    const sort: Record<string, string> = {};
    if (dto.sort) {
      const { sortBy, sortOrder, ...rest } = dto.sort;
      if (Object.keys(rest).length > 0) {
        throw new BadRequestException('Invalid view sort');
      }
      if (sortBy !== undefined) {
        if (!(LEAD_SORT_FIELDS as readonly unknown[]).includes(sortBy)) {
          throw new BadRequestException('Invalid view sort');
        }
        sort.sortBy = sortBy as string;
      }
      if (sortOrder !== undefined) {
        if (sortOrder !== 'asc' && sortOrder !== 'desc') {
          throw new BadRequestException('Invalid view sort');
        }
        sort.sortOrder = sortOrder;
      }
    }

    const display: Record<string, unknown> = {};
    if (dto.display) {
      const { layout, density, columns, ...rest } = dto.display;
      if (Object.keys(rest).length > 0) {
        throw new BadRequestException('Invalid view display');
      }
      if (layout !== undefined) {
        if (layout !== 'list' && layout !== 'board') {
          throw new BadRequestException('Invalid view layout');
        }
        display.layout = layout;
      }
      if (density !== undefined) {
        if (density !== 'comfortable' && density !== 'compact') {
          throw new BadRequestException('Invalid view density');
        }
        display.density = density;
      }
      if (columns !== undefined) {
        if (
          typeof columns !== 'object' ||
          columns === null ||
          Array.isArray(columns)
        ) {
          throw new BadRequestException('Invalid view columns');
        }
        const entries = Object.entries(columns as Record<string, unknown>);
        if (
          entries.length > MAX_COLUMNS ||
          entries.some(
            ([key, value]) =>
              !COLUMN_ID.test(key) || typeof value !== 'boolean',
          )
        ) {
          throw new BadRequestException('Invalid view columns');
        }
        display.columns = Object.fromEntries(entries);
      }
    }

    if (
      Buffer.byteLength(JSON.stringify({ filters, sort, display })) >
      MAX_VIEW_BYTES
    ) {
      throw new BadRequestException('This view is too large to save');
    }
    return { filters, sort, display };
  }

  /** Only the creator edits or deletes a view. */
  private async getOwnOrThrow(tenantId: string, userId: string, id: string) {
    const view = await this.prisma.savedView.findFirst({
      where: { id, tenantId, userId },
      select: { id: true },
    });
    if (!view) throw new NotFoundException('View not found');
    return view;
  }

  private mapUniqueName(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('You already have a view with this name');
    }
    return error;
  }

  private toResponse(view: ViewRecord, userId: string): SavedViewResponse {
    const { user, ...rest } = view;
    return { ...rest, owner: user, isOwn: user.id === userId };
  }
}
