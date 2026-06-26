import { BadRequestException } from '@nestjs/common';
import { SortOrder } from '../enums/sort-order.enum';
import { SortConfig } from '../types/sort-config.type';

export function validateSortField<T extends string>(
  sortBy: string | undefined,
  allowedFields: readonly T[],
): T | undefined {
  if (sortBy === undefined) {
    return undefined;
  }

  if (!allowedFields.includes(sortBy as T)) {
    throw new BadRequestException(
      `sortBy must be one of: ${allowedFields.join(', ')}`,
    );
  }

  return sortBy as T;
}

export function resolveSortOrder(sortOrder?: SortOrder): SortOrder {
  return sortOrder ?? SortOrder.ASC;
}

export function buildOrderBy<T extends string>(
  sortBy: string | undefined,
  sortOrder: SortOrder | undefined,
  config: SortConfig<T>,
): Record<T, SortOrder> {
  const field =
    validateSortField(sortBy, config.allowedFields) ?? config.defaultField;
  const order = sortOrder ?? config.defaultOrder ?? SortOrder.ASC;

  return { [field]: order } as Record<T, SortOrder>;
}
