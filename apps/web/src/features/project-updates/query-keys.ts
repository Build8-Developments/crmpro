import type { ProjectUpdatesFeedParams } from "./types";

/** Every project-updates query lives under this prefix (one invalidation). */
export const projectUpdateKeys = {
  all: () => ["project-updates"] as const,
  forProject: (projectId: string) =>
    ["project-updates", "project", projectId] as const,
  feed: (params: ProjectUpdatesFeedParams) =>
    ["project-updates", "feed", params] as const,
};
