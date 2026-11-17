export type NotificationPreferenceCategory =
  | "LEAD_ASSIGNED"
  | "IMPORT_COMPLETED"
  | "EXPORT_COMPLETED"
  | "PIPELINE_UPDATES"
  | "MARKETING"
  | "SYSTEM"
  | "SECURITY"
  | "TASK_UPDATES"
  | "PROJECT_UPDATES";

export interface NotificationPreference {
  category: NotificationPreferenceCategory;
  label: string;
  enabled: boolean;
  emailEnabled: boolean;
}

export interface UpdateNotificationPreferencesInput {
  preferences: Array<{
    category: NotificationPreferenceCategory;
    enabled: boolean;
    emailEnabled?: boolean;
  }>;
}
