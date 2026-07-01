export const dashboardLeadLinks = {
  all: "/leads",
  open: "/leads?status=OPEN",
  stale: "/leads?stale=true",
  unassigned: "/leads?unassigned=true",
  stage: (stageId: string) => `/leads?stageId=${stageId}`,
  assignee: (userId: string) => `/leads?assignedUserId=${userId}`,
  source: (sourceId: string) => `/leads?sourceId=${sourceId}`,
  project: (projectId: string) => `/leads?projectId=${projectId}`,
  lead: (leadId: string) => `/leads?id=${leadId}`,
} as const;
