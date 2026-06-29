import { BadRequestException } from '@nestjs/common';

export function parseAuditDate(value: string, field: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${field} date`);
  }

  return parsed;
}

export function parseAuditDateEnd(value: string, field: string): Date {
  const parsed = parseAuditDate(value, field);
  parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

export function buildCreatedAtRange(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  const fromDate = from ? parseAuditDate(from, 'from') : undefined;
  const toDate = to ? parseAuditDateEnd(to, 'to') : undefined;

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new BadRequestException(
      'Invalid date range: from must be before or equal to to',
    );
  }

  if (!fromDate && !toDate) {
    return undefined;
  }

  return {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: toDate } : {}),
  };
}
