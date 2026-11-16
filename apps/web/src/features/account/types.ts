export type NotificationPreferenceCategory =
  | "LEAD_ASSIGNED"
  | "IMPORT_COMPLETED"
  | "EXPORT_COMPLETED"
  | "PIPELINE_UPDATES"
  | "MARKETING"
  | "SYSTEM"
  | "SECURITY"
  | "TASK_UPDATES";

export interface NotificationPreference {
  category: NotificationPreferenceCategory;
  label: string;
  enabled: boolean;
}

export interface UpdateNotificationPreferencesInput {
  preferences: Array<{
    category: NotificationPreferenceCategory;
    enabled: boolean;
  }>;
}
