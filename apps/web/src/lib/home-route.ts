import { useAuthStore } from "@/stores/auth-store";

/**
 * Where someone lands after signing in: people who work their own leads start
 * on Today (the system's plan for their day); organization-wide managers on
 * the dashboard.
 */
export function getHomeRoute(): "/today" | "/dashboard" {
  const { permissions } = useAuthStore.getState();
  return permissions.has("lead.read-all") ? "/dashboard" : "/today";
}
