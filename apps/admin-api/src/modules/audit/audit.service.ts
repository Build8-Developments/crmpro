import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/pagination/utils/pagination.util';
import type { PaginatedResponse } from '../../common/pagination/types/paginated-response.type';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetAuditQueryDto } from './dto/get-audit-query.dto';
import type { AdminAuditLogResponse } from './types/audit.types';
import { buildCreatedAtRange } from './utils/audit-date.util';
import { toAdminAuditLogResponse } from './utils/audit.mapper';

const adminAuditLogSelect = {
  id: true,
  actorType: true,
  action: true,
  entityType: true,
  entityId: true,
  ipAddress: true,
  userAgent: true,
  fingerprint: true,
  metadata: true,
  createdAt: true,
  actorAdmin: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.AdminAuditLogSelect;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(
    query: GetAuditQueryDto,
  ): Promise<PaginatedResponse<AdminAuditLogResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(query);

    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: adminAuditLogSelect,
        skip,
        take,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return buildPaginatedResponse(
      rows.map((row) => toAdminAuditLogResponse(row)),
      page,
      limit,
      totalItems,
    );
  }

  async getAuditLog(id: string): Promise<AdminAuditLogResponse> {
    const row = await this.prisma.adminAuditLog.findUnique({
      where: { id },
      select: adminAuditLogSelect,
    });

    if (!row) {
      throw new NotFoundException('Audit log not found');
    }

    return toAdminAuditLogResponse(row);
  }

  private buildWhereClause(
    query: GetAuditQueryDto,
  ): Prisma.AdminAuditLogWhereInput {
    const createdAt = buildCreatedAtRange(query.from, query.to);

    return {
      ...(query.actorAdminId ? { actorAdminId: query.actorAdminId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.tenantId
        ? {
            entityType: 'Tenant',
            entityId: query.tenantId,
          }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };
  }
}
