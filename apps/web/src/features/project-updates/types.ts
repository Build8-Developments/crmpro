export type ProjectUpdateType =
  | "PRICE_CHANGE"
  | "NEW_PHASE"
  | "AVAILABILITY"
  | "GENERAL";

export interface ProjectUpdate {
  id: string;
  type: ProjectUpdateType;
  title: string;
  body: string | null;
  createdAt: string;
  project: { id: string; name: string };
  author: { id: string; fullName: string };
}

export interface ProjectUpdatesPage {
  items: ProjectUpdate[];
  nextCursor: string | null;
}

export interface CreateProjectUpdateInput {
  type: ProjectUpdateType;
  title: string;
  body?: string;
  notify?: boolean;
}

export const PROJECT_UPDATE_TYPES: ProjectUpdateType[] = [
  "PRICE_CHANGE",
  "NEW_PHASE",
  "AVAILABILITY",
  "GENERAL",
];
