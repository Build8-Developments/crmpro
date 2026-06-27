import { BadRequestException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';

export function assertLeadNotArchived(status: LeadStatus): void {
  if (status === LeadStatus.ARCHIVED) {
    throw new BadRequestException('Archived leads cannot be modified');
  }
}
