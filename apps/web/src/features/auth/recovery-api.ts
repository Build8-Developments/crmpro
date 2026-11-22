import { apiClient } from "@/lib/api/client";

const PUBLIC = { skipAuth: true, skipRefresh: true } as const;

export function requestPasswordReset(input: { tenantSlug: string; email: string }) {
  return apiClient.post<void>("/auth/forgot-password", input, PUBLIC);
}

export function resetPassword(input: { token: string; password: string }) {
  return apiClient.post<void>("/auth/reset-password", input, PUBLIC);
}

export interface InvitationInfo {
  name: string;
  email: string;
  workspaceName: string;
  workspaceSlug: string;
}

/** The token travels in the body, never in a URL path (server logs). */
export function getInvitation(token: string) {
  return apiClient.post<InvitationInfo>("/auth/invitations/peek", { token }, PUBLIC);
}

export function acceptInvitation(input: { token: string; password: string }) {
  return apiClient.post<{ email: string; workspaceSlug: string }>(
    "/auth/accept-invite",
    input,
    PUBLIC,
  );
}
