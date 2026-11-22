export interface OrganizationSettings {
  countryCode: string;
  timezone: string;
  currency: string;
  /** 0 = Sunday … 6 = Saturday */
  weekStartsOn: number;
  /** 0 = Sunday … 6 = Saturday */
  workingDays: number[];
  /** Minutes after midnight (600 = 10:00). */
  workdayStartMinute: number;
  workdayEndMinute: number;
  firstContactSlaMinutes: number;
  escalateAfterMinutes: number;
  dailyInteractionGoal: number;
  /** Agents see the top 3 and their own rank on My performance. */
  showLeaderboardToAgents: boolean;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  settings: OrganizationSettings;
}

export type UpdateOrganizationSettingsInput = Partial<
  Omit<OrganizationSettings, "updatedAt">
>;

export interface UsageMetric {
  used: number;
  /** null = unlimited */
  limit: number | null;
}

export interface OrganizationUsage {
  plan: {
    name: string;
    features: { analytics: boolean; importExport: boolean };
  };
  status: string;
  contract: {
    status: string;
    startsAt: string;
    endsAt: string | null;
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
