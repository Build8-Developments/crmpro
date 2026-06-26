import { SortOrder } from '../enums/sort-order.enum';

export type SortConfig<T extends string> = {
  allowedFields: readonly T[];
  defaultField: T;
  defaultOrder?: SortOrder;
};
