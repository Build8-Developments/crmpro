import {
  ContactChannelPreference,
  InterestLevel,
  LeadHeat,
  LeadStatus,
  PaymentPreference,
  PurchasePurpose,
} from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { IntersectionType } from '@nestjs/swagger';
import { ListQueryDto, SearchQueryDto } from '../../../common/query';
import {
  LEAD_LAST_CONTACT_FILTERS,
  LEAD_NEXT_STEP_FILTERS,
  LEAD_SLA_BREACHED_FILTERS,
  type LeadLastContactFilter,
  type LeadNextStepFilter,
  type LeadSlaBreachedFilter,
} from '../types/lead.types';

function parseOptionalBoolean(value: unknown): unknown {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return value;
}

/** Accepts `a,b,c` or repeated params; empty entries are dropped. */
function parseList({ value }: { value: unknown }): unknown {
  const raw: unknown = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(raw)) return raw;
  return (raw as unknown[])
    .flatMap((item): unknown[] =>
      typeof item === 'string' ? item.split(',') : [item],
    )
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '');
}

const UUID_OR_UNASSIGNED =
  /^(unassigned|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Filters shared by the list endpoint and bulk "all matching" actions.
 * See docs/product/workflow-engine-spec.md §3.5.
 */
export class LeadFiltersDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  unassignedOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  staleOnly?: boolean;

  /** Open status and an open (not won/lost) stage. */
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  openOnly?: boolean;

  /** Owner ids, or `unassigned`. */
  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(UUID_OR_UNASSIGNED, { each: true })
  assignees?: string[];

  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  stageIds?: string[];

  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  sourceIds?: string[];

  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @IsEnum(LeadHeat, { each: true })
  heat?: LeadHeat[];

  @IsOptional()
  @IsEnum(InterestLevel)
  interestLevel?: InterestLevel;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdTo?: Date;

  @IsOptional()
  @IsIn(LEAD_LAST_CONTACT_FILTERS)
  lastContact?: LeadLastContactFilter;

  @IsOptional()
  @IsIn(LEAD_NEXT_STEP_FILTERS)
  nextStep?: LeadNextStepFilter;

  /** `today`: first-contact SLA missed today (workspace time zone). */
  @IsOptional()
  @IsIn(LEAD_SLA_BREACHED_FILTERS)
  slaBreached?: LeadSlaBreachedFilter;

  /** Open and in the stage longer than its `stuckAfterDays` (R9). */
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  stuck?: boolean;

  /** Open with no contact for the stage's `staleAfterDays` (R8). */
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  stageStale?: boolean;

  /** Has an owner (any). */
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  assignedOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  unansweredMin?: number;

  @IsOptional()
  @IsUUID()
  lostReasonId?: string;

  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @IsEnum(PaymentPreference, { each: true })
  paymentPreferences?: PaymentPreference[];

  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @IsEnum(ContactChannelPreference, { each: true })
  contactChannelPreferences?: ContactChannelPreference[];

  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @IsEnum(PurchasePurpose, { each: true })
  purchasePurposes?: PurchasePurpose[];

  /** Case-insensitive "contains" on where the client lives. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  residenceArea?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;
}

/** List query: pagination + sort + search + every lead filter. */
export class GetLeadsQueryDto extends IntersectionType(
  ListQueryDto,
  LeadFiltersDto,
) {}

/** Filters used to select "all leads matching" for bulk actions. */
export class LeadSelectionFiltersDto extends IntersectionType(
  SearchQueryDto,
  LeadFiltersDto,
) {}
