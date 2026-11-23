/**
 * Fields a user can pick from either lead when merging duplicates. Anything
 * not listed stays with the surviving lead (pipeline, stage, status, heat,
 * lost reason, phones) or is combined automatically (history, tasks, files,
 * project interests, contact counters).
 *
 * `budget` covers budgetMin + budgetMax together so a range is never split.
 */
export const LEAD_MERGE_FIELDS = [
  'fullName',
  'email',
  'source',
  'budget',
  'occupation',
  'residenceArea',
  'paymentPreference',
  'contactChannelPreference',
  'contactTimePreference',
  'purchasePurpose',
  'assignee',
] as const;

export type LeadMergeField = (typeof LEAD_MERGE_FIELDS)[number];

/** Which lead a merged field takes its value from. */
export type LeadMergeFieldChoice = 'target' | 'source';
