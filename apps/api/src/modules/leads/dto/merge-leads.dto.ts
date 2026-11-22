import type {
  LeadMergeField,
  LeadMergeFieldChoice,
} from '@crmpro/shared/leads';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';

const CHOICES: LeadMergeFieldChoice[] = ['target', 'source'];

/**
 * Per-field pick between the surviving lead ("target") and the duplicate that
 * disappears ("source"). A missing field keeps the target's value, unless the
 * target's is empty and the source has one (blanks are filled in).
 */
export class LeadMergeFieldsDto implements Partial<
  Record<LeadMergeField, LeadMergeFieldChoice>
> {
  @IsOptional()
  @IsIn(CHOICES)
  fullName?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  email?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  source?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  budget?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  occupation?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  residenceArea?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  paymentPreference?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  contactChannelPreference?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  contactTimePreference?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  purchasePurpose?: LeadMergeFieldChoice;

  @IsOptional()
  @IsIn(CHOICES)
  assignee?: LeadMergeFieldChoice;
}

/** POST /leads/:id/merge — `:id` survives, `sourceLeadId` is merged into it. */
export class MergeLeadsDto {
  @IsUUID()
  sourceLeadId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeadMergeFieldsDto)
  fields?: LeadMergeFieldsDto;
}
