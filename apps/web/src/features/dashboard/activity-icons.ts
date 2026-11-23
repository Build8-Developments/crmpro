import type { AppIcon } from "@/components/icons/app-icons";
import { AppIcons } from "@/components/icons/app-icons";

export interface ActivityMeta {
  label: string;
  icon: AppIcon;
  iconClassName: string;
  badgeClassName: string;
}

export function getActivityMeta(type: string): ActivityMeta {
  switch (type) {
    case "LEAD_CREATED":
      return {
        label: "Created",
        icon: AppIcons.userPlus,
        iconClassName: "bg-primary/12 text-primary",
        badgeClassName: "bg-primary/10 text-primary border-transparent",
      };
    case "LEAD_ASSIGNED":
      return {
        label: "Assigned",
        icon: AppIcons.userPlus,
        iconClassName: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
        badgeClassName:
          "bg-sky-500/10 text-sky-700 border-transparent dark:text-sky-300",
      };
    case "STAGE_CHANGED":
      return {
        label: "Stage",
        icon: AppIcons.stageChange,
        iconClassName: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
        badgeClassName:
          "bg-violet-500/10 text-violet-700 border-transparent dark:text-violet-300",
      };
    case "IMPORT_COMPLETED":
      return {
        label: "Import",
        icon: AppIcons.upload,
        iconClassName: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
        badgeClassName:
          "bg-emerald-500/10 text-emerald-700 border-transparent dark:text-emerald-300",
      };
    case "EXPORT_COMPLETED":
      return {
        label: "Export",
        icon: AppIcons.download,
        iconClassName: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
        badgeClassName:
          "bg-amber-500/10 text-amber-700 border-transparent dark:text-amber-300",
      };
    case "BULK_LEAD_ASSIGNED":
      return {
        label: "Bulk assign",
        icon: AppIcons.team,
        iconClassName: "bg-orange-500/12 text-orange-700 dark:text-orange-400",
        badgeClassName:
          "bg-orange-500/10 text-orange-700 border-transparent dark:text-orange-300",
      };
    case "BULK_LEAD_STAGE_CHANGED":
      return {
        label: "Bulk move",
        icon: AppIcons.stageChange,
        iconClassName: "bg-orange-500/12 text-orange-700 dark:text-orange-400",
        badgeClassName:
          "bg-orange-500/10 text-orange-700 border-transparent dark:text-orange-300",
      };
    default:
      return {
        label: "Activity",
        icon: AppIcons.activity,
        iconClassName: "bg-muted text-muted-foreground",
        badgeClassName: "bg-secondary text-secondary-foreground border-transparent",
      };
  }
}

export function getActivityIcon(type: string): AppIcon {
  return getActivityMeta(type).icon;
}
