import { apiClient } from "@/lib/api/client";
import type { AuthUser } from "@/types/auth";
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

export interface UpdateMeInput {
  name?: string;
  phone?: string | null;
  showOnLeaderboard?: boolean;
}

/** PATCH /me — the signed-in user's own profile (no extra permission). */
export function updateMe(input: UpdateMeInput) {
  return apiClient.patch<AuthUser>("/me", input);
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** POST /me/password — signs out every other session on success. */
export function changePassword(input: ChangePasswordInput) {
  return apiClient.post<{ revokedSessions: number }>("/me/password", input);
}
