import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { LeadSelectionFiltersDto } from './get-leads-query.dto';

export const TRANSFER_DISTRIBUTIONS = ['EVEN', 'BALANCE'] as const;
export type TransferDistribution = (typeof TRANSFER_DISTRIBUTIONS)[number];

/**
 * Move a user's open leads (and their open tasks) to one or more teammates —
 * someone leaves, goes on leave, or is overloaded. `filters` narrows what
 * moves (e.g. only overdue, only certain stages).
 *
 * - EVEN: split equally (hot leads are spread first so nobody gets all of them).
 * - BALANCE: each lead goes to whoever has the fewest open leads at that point.
 */
export class BulkTransferLeadsDto {
  @IsUUID('4')
  fromUserId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  toUserIds: string[];

  @IsOptional()
  @IsIn(TRANSFER_DISTRIBUTIONS)
  distribution?: TransferDistribution;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeadSelectionFiltersDto)
  filters?: LeadSelectionFiltersDto;
}
