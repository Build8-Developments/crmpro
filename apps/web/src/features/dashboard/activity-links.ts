import type { ActivityFeedItem } from "./types";

export function getActivityHref(item: ActivityFeedItem): string | null {
  const leadId =
    typeof item.metadata.leadId === "string" ? item.metadata.leadId : undefined;

  switch (item.type) {
    case "LEAD_CREATED":
    case "LEAD_ASSIGNED":
    case "STAGE_CHANGED":
      return leadId ? `/leads?id=${leadId}` : "/leads";
    case "IMPORT_COMPLETED":
      return "/imports";
    case "EXPORT_COMPLETED":
      return "/exports";
    default:
      return null;
  }
}
