export interface OrganizationSettingsResponse {
  countryCode: string;
  timezone: string;
  currency: string;
  weekStartsOn: number;
  workingDays: number[];
  workdayStartMinute: number;
  workdayEndMinute: number;
  firstContactSlaMinutes: number;
  escalateAfterMinutes: number;
  dailyInteractionGoal: number;
  /** Agents see the top 3 and their own rank on My performance. */
  showLeaderboardToAgents: boolean;
  updatedAt: Date;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  settings: OrganizationSettingsResponse;
}

export interface UsageMetric {
  used: number;
  /** null = unlimited on the current plan. */
  limit: number | null;
}

export interface OrganizationUsageResponse {
  plan: {
    name: string;
    features: { analytics: boolean; importExport: boolean };
  };
  status: string;
  contract: {
    status: string;
    startsAt: Date;
    endsAt: Date | null;
    gracePeriodDays: number | null;
    autoRenew: boolean;
  } | null;
  usage: {
    users: UsageMetric;
    leads: UsageMetric;
    projects: UsageMetric;
    storageBytes: UsageMetric;
  };
}
