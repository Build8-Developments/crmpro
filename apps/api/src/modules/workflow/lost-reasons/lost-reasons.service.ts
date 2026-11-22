import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateLostReasonDto,
  UpdateLostReasonDto,
} from './dto/lost-reason.dto';

const lostReasonSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  recyclable: true,
  recycleAfterDays: true,
  _count: { select: { leads: true } },
} satisfies Prisma.LostReasonSelect;

type LostReasonRecord = Prisma.LostReasonGetPayload<{
  select: typeof lostReasonSelect;
}>;

export interface LostReasonResponse {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  recyclable: boolean;
  recycleAfterDays: number | null;
  leadCount: number;
}

function toResponse(record: LostReasonRecord): LostReasonResponse {
  return {
    id: record.id,
    name: record.name,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
    recyclable: record.recyclable,
    recycleAfterDays: record.recycleAfterDays,
    leadCount: record._count.leads,
  };
}

@Injectable()
export class LostReasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    includeInactive = false,
  ): Promise<LostReasonResponse[]> {
    const records = await this.prisma.lostReason.findMany({
      where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: lostReasonSelect,
    });
    return records.map(toResponse);
  }

  /** Throws unless the reason exists, belongs to the tenant and is active. */
  async assertUsable(
    tenantId: string,
    id: string,
  ): Promise<{ id: string; name: string }> {
    const reason = await this.prisma.lostReason.findFirst({
      where: { id, tenantId, isActive: true },
      select: { id: true, name: true },
    });
    if (!reason) {
      throw new BadRequestException('Lost reason not found');
    }
    return reason;
  }

  async create(
    tenantId: string,
    dto: CreateLostReasonDto,
  ): Promise<LostReasonResponse> {
    const last = await this.prisma.lostReason.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });
    try {
      const record = await this.prisma.lostReason.create({
        data: {
          tenantId,
          name: dto.name,
          recyclable: dto.recyclable ?? false,
          recycleAfterDays: dto.recyclable
            ? (dto.recycleAfterDays ?? 90)
            : null,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
        },
        select: lostReasonSelect,
      });
      return toResponse(record);
    } catch (error) {
      throw this.mapUniqueError(error);
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateLostReasonDto,
  ): Promise<LostReasonResponse> {
    const existing = await this.getOrThrow(tenantId, id);
    const recyclable = dto.recyclable ?? existing.recyclable;
    try {
      const record = await this.prisma.lostReason.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          recyclable,
          recycleAfterDays: recyclable
            ? (dto.recycleAfterDays ?? existing.recycleAfterDays ?? 90)
            : null,
        },
        select: lostReasonSelect,
      });
      return toResponse(record);
    } catch (error) {
      throw this.mapUniqueError(error);
    }
  }

  /** Reasons already used by leads are archived (kept for reports), others deleted. */
  async remove(tenantId: string, id: string): Promise<{ archived: boolean }> {
    const existing = await this.getOrThrow(tenantId, id);
    if (existing._count.leads > 0) {
      await this.prisma.lostReason.update({
        where: { id },
        data: { isActive: false },
      });
      return { archived: true };
    }
    await this.prisma.lostReason.delete({ where: { id } });
    return { archived: false };
  }

  private async getOrThrow(
    tenantId: string,
    id: string,
  ): Promise<LostReasonRecord> {
    const record = await this.prisma.lostReason.findFirst({
      where: { id, tenantId },
      select: lostReasonSelect,
    });
    if (!record) throw new NotFoundException('Lost reason not found');
    return record;
  }

  private mapUniqueError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'A lost reason with this name already exists',
      );
    }
    return error;
  }
}
