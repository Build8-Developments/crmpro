import type { LeadMergeField } from '@crmpro/shared/leads';
import type { LeadResponse } from './lead.types';

/** What hangs off a lead and moves with it when it is merged away. */
export interface LeadMergeCounts {
  interactions: number;
  tasks: number;
  notes: number;
  files: number;
}

/** A live lead in the caller's scope that looks like the same person. */
export type LeadDuplicateResponse = LeadResponse & {
  counts: LeadMergeCounts;
  /** Why it matched: a shared (normalized) phone and/or the same email. */
  matchedOn: Array<'phone' | 'email'>;
  /** Mergeable fields whose (unmasked) values differ from the lead asked about. */
  differingFields: LeadMergeField[];
};

export interface LeadDuplicatesResponse {
  /** Counts for the lead asked about (for "what moves" when it is the one merged away). */
  counts: LeadMergeCounts;
  items: LeadDuplicateResponse[];
}

export interface LeadMergeResult {
  /** The surviving lead after the merge. */
  lead: LeadResponse;
  /** The lead that was merged away (now soft-deleted, `mergedIntoId` set). */
  mergedLeadId: string;
  moved: LeadMergeCounts & {
    activities: number;
    projectInterests: number;
  };
  /** Fields that took the merged-away lead's value. */
  fieldsFromSource: LeadMergeField[];
  /** The merged-away lead's phone became the survivor's secondary phone. */
  secondaryPhoneAdded: boolean;
}
