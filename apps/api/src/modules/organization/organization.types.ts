export interface OrganizationSettingsResponse {
  countryCode: string;
  timezone: string;
  currency: string;
  weekStartsOn: number;
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
