import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class LeadAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeadOrThrow(
    id: string,
    tenantId: string,
    options?: { requireOpen?: boolean },
  ): Promise<{ id: string; status: LeadStatus }> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
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
