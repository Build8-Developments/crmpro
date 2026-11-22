import { DealStatus } from '@crmpro/database';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/query/dto/list-query.dto';

export const DEAL_SORT_FIELDS = [
  'reservedAt',
  'contractedAt',
  'price',
] as const;
export type DealSortField = (typeof DEAL_SORT_FIELDS)[number];

/** Which date the from–to period applies to; `any` = reserved or contracted. */
export const DEAL_PERIOD_FIELDS = [
  'any',
  'reservedAt',
  'contractedAt',
] as const;
export type DealPeriodField = (typeof DEAL_PERIOD_FIELDS)[number];

/** `search` matches the lead name; `sortBy` is one of DEAL_SORT_FIELDS. */
export class GetDealsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  /** Exclusive upper bound. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @IsIn(DEAL_PERIOD_FIELDS)
  periodField?: DealPeriodField;
}
