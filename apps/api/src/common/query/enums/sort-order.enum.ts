export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/** Allowed API values for sortOrder query/body fields. */
export const SORT_ORDER_VALUES = [SortOrder.ASC, SortOrder.DESC] as const;

export type SortOrderValue = (typeof SORT_ORDER_VALUES)[number];
