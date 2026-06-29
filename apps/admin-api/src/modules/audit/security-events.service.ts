import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/pagination/utils/pagination.util';
import type { PaginatedResponse } from '../../common/pagination/types/paginated-response.type';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetSecurityEventsQueryDto } from './dto/get-security-events-query.dto';
import type { AdminSecurityEventResponse } from './types/security-event.types';
import { buildCreatedAtRange } from './utils/audit-date.util';
import { toAdminSecurityEventResponse } from './utils/audit.mapper';

const adminSecurityEventSelect = {
  id: true,
  eventType: true,
  severity: true,
  ipAddress: true,
  userAgent: true,
  fingerprint: true,
  metadata: true,
  createdAt: true,
  admin: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.AdminSecurityEventSelect;

@Injectable()
export class SecurityEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSecurityEvents(
    query: GetSecurityEventsQueryDto,
  ): Promise<PaginatedResponse<AdminSecurityEventResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(query);

    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.adminSecurityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: adminSecurityEventSelect,
        skip,
        take,
      }),
      this.prisma.adminSecurityEvent.count({ where }),
    ]);

    return buildPaginatedResponse(
      rows.map((row) => toAdminSecurityEventResponse(row)),
      page,
      limit,
      totalItems,
    );
  }

  async getSecurityEvent(id: string): Promise<AdminSecurityEventResponse> {
    const row = await this.prisma.adminSecurityEvent.findUnique({
      where: { id },
      select: adminSecurityEventSelect,
    });

    if (!row) {
      throw new NotFoundException('Security event not found');
    }

    return toAdminSecurityEventResponse(row);
  }

  private buildWhereClause(
    query: GetSecurityEventsQueryDto,
  ): Prisma.AdminSecurityEventWhereInput {
    const createdAt = buildCreatedAtRange(query.from, query.to);

    return {
      ...(query.adminId ? { adminId: query.adminId } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
  }
}
