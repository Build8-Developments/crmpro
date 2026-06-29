import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetAuditQueryDto } from './dto/get-audit-query.dto';
import type { AuditLogResponse } from './types/audit.types';
import {
  parseAuditDate,
  parseAuditDateEnd,
  toAuditLogResponse,
} from './utils/audit.mapper';

const auditLogSelect = {
  id: true,
  actorType: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AuditLogSelect;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(
    tenantId: string,
    query: GetAuditQueryDto,
  ): Promise<PaginatedResponse<AuditLogResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(tenantId, query);

    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: auditLogSelect,
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResponse(
      rows.map((row) => toAuditLogResponse(row)),
      page,
      limit,
      totalItems,
    );
  }

  async getAuditLog(
    tenantId: string,
    id: string,
  ): Promise<AuditLogResponse> {
    const row = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
      select: auditLogSelect,
    });

    if (!row) {
      throw new NotFoundException('Audit log not found');
    }

    return toAuditLogResponse(row);
  }

  private buildWhereClause(
    tenantId: string,
    query: GetAuditQueryDto,
  ): Prisma.AuditLogWhereInput {
    const from = query.from ? parseAuditDate(query.from, 'from') : undefined;
    const to = query.to ? parseAuditDateEnd(query.to, 'to') : undefined;

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'Invalid date range: from must be before or equal to to',
      );
    }

    return {
      tenantId,
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
  }
}
