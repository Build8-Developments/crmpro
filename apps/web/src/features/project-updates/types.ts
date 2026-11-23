export type ProjectUpdateType =
  | "PRICE_CHANGE"
  | "NEW_PHASE"
  | "AVAILABILITY"
  | "GENERAL";

export const PROJECT_UPDATE_TYPES: ProjectUpdateType[] = [
  "PRICE_CHANGE",
  "NEW_PHASE",
  "AVAILABILITY",
  "GENERAL",
];

/** Mirrors the API limits (CreateProjectUpdateDto). */
export const PROJECT_UPDATE_TITLE_MAX = 160;
export const PROJECT_UPDATE_BODY_MAX = 4000;

export interface ProjectUpdate {
  id: string;
  projectId: string;
  type: ProjectUpdateType;
  title: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  /** Null once the author's account is removed. */
  author: { id: string; fullName: string } | null;
}

export interface ProjectUpdatesPage {
  items: ProjectUpdate[];
  nextCursor: string | null;
}

export interface ProjectUpdatesFeedParams {
  limit?: number;
  cursor?: string;
  projectIds?: string[];
  /** `mine`: projects the caller sells (open leads or live deals). */
  scope?: "all" | "mine";
  sinceDays?: number;
}

export interface CreateProjectUpdateInput {
  type: ProjectUpdateType;
  title: string;
  body?: string | null;
}

export type UpdateProjectUpdateInput = Partial<CreateProjectUpdateInput>;
