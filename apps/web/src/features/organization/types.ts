export interface OrganizationSettings {
  countryCode: string;
  timezone: string;
  currency: string;
  /** 0 = Sunday … 6 = Saturday */
  weekStartsOn: number;
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
  Pick<OrganizationSettings, "countryCode" | "timezone" | "currency" | "weekStartsOn">
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
