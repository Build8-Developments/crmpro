/** Mirrors DASHBOARD_PERIODS in apps/api/.../dashboard-v2/dashboard-period.ts. */
export const DASHBOARD_PERIODS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-90-days", label: "Last 90 days" },
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["value"];
export const DASHBOARD_PERIOD_DEFAULT: DashboardPeriod = "this-month";

export interface DashboardSectionProps {
  period: DashboardPeriod;
}

/**
 * Query keys for the v2 sections. They sit under `["dashboard"]`, so every
 * mutation that already invalidates `queryKeys.dashboard.all()` (leads,
 * deals, users, realtime…) refreshes them too.
 */
export const dashboardV2Keys = {
  all: ["dashboard", "v2"] as const,
  section: (section: string, period: DashboardPeriod) =>
    ["dashboard", "v2", section, period] as const,
};
