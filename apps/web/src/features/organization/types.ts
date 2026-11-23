/** What agents see about each other on the My performance leaderboard. */
export type LeaderboardMode = "OFF" | "RANK_ONLY" | "TARGET_PERCENT" | "FULL";

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
  /** What agents see about each other on My performance. */
  leaderboardMode: LeaderboardMode;
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

export type ContractTerminationMode = "FULL_ACCESS" | "READ_ONLY" | "IMMEDIATE";

export interface OrganizationContract {
  status: string;
  startsAt: string;
  endsAt: string | null;
  gracePeriodDays: number | null;
  autoRenew: boolean;
  /** The plan name as signed. */
  planName: string;
  /** Price and payment terms; null without billing access. */
  pricing: {
    agreedPrice: number;
    currency: string;
    paymentMethod: string;
    paymentFrequency: string;
  } | null;
  termination: {
    mode: ContractTerminationMode | null;
    terminatedAt: string | null;
    accessEndsAt: string | null;
  } | null;
}

export interface OrganizationUsage {
  plan: {
    name: string;
    features: { analytics: boolean; importExport: boolean };
  };
  status: string;
  /** Active contract, else the latest terminated/expired one. */
  contract: OrganizationContract | null;
  /** snapshot = limits frozen when the contract was signed. */
  limits: {
    source: "snapshot" | "live";
    capturedAt: string | null;
  };
  usage: {
    users: UsageMetric;
    leads: UsageMetric;
    projects: UsageMetric;
    storageBytes: UsageMetric;
  };
}
