import { apiClient } from "@/lib/api/client";
import type {
  NotificationPreference,
  UpdateNotificationPreferencesInput,
} from "./types";

export function getNotificationPreferences() {
  return apiClient.get<NotificationPreference[]>("/notification-preferences");
}

export function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
) {
  return apiClient.patch<NotificationPreference[]>(
    "/notification-preferences",
    input,
  );
}
