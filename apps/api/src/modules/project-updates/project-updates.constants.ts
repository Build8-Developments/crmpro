import { ProjectUpdateType } from '@crmpro/database';

export const PROJECT_UPDATE_TITLE_MAX = 160;
export const PROJECT_UPDATE_BODY_MAX = 4000;

export const PROJECT_UPDATES_DEFAULT_LIMIT = 20;
export const PROJECT_UPDATES_MAX_LIMIT = 50;
/** Longest look-back the feed accepts (`sinceDays`). */
export const PROJECT_UPDATES_MAX_SINCE_DAYS = 90;
/** Cap on the project ids a feed request may filter on. */
export const PROJECT_UPDATES_MAX_PROJECT_IDS = 50;

/** Cap on the in-app fan-out of one update. */
export const PROJECT_UPDATE_MAX_RECIPIENTS = 500;
/** Body excerpt carried in the notification message. */
export const PROJECT_UPDATE_MESSAGE_EXCERPT = 200;

/** Project files shown in the project drawer (brochures, price sheets). */
export const PROJECT_FILES_LIMIT = 100;

export const PROJECT_UPDATE_AUDIT_ENTITY = 'ProjectUpdate';

export const PROJECT_UPDATE_AUDIT_ACTIONS = {
  POSTED: 'PROJECT_UPDATE_POSTED',
  EDITED: 'PROJECT_UPDATE_EDITED',
  DELETED: 'PROJECT_UPDATE_DELETED',
} as const;

export const PROJECT_UPDATE_TYPE_LABELS: Record<ProjectUpdateType, string> = {
  [ProjectUpdateType.PRICE_CHANGE]: 'Price change',
  [ProjectUpdateType.NEW_PHASE]: 'New phase',
  [ProjectUpdateType.AVAILABILITY]: 'Availability',
  [ProjectUpdateType.GENERAL]: 'General',
};

/** Types agents must act on quickly (re-quote clients, units going fast). */
export const HIGH_PRIORITY_PROJECT_UPDATE_TYPES: ReadonlySet<ProjectUpdateType> =
  new Set([ProjectUpdateType.PRICE_CHANGE, ProjectUpdateType.AVAILABILITY]);

/** Where a project update notification links to (the project drawer). */
export function projectUpdateHref(projectId: string): string {
  return `/projects?id=${encodeURIComponent(projectId)}`;
}
