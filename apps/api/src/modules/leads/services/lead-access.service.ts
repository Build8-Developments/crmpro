import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { type LeadScope, leadScopeWhere } from '../../../common/auth';

@Injectable()
export class LeadAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeadOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
    options?: { requireOpen?: boolean },
  ): Promise<{ id: string; status: LeadStatus }> {
    // Out of scope behaves exactly like missing.
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: { id: true, status: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (options?.requireOpen && lead.status === LeadStatus.ARCHIVED) {
      throw new BadRequestException('Archived leads cannot be modified');
    }

    return lead;
  }
}
