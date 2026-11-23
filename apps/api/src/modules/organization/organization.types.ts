import type { LeaderboardMode } from '@crmpro/database';

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
  /** What agents see about each other on My performance. */
  leaderboardMode: LeaderboardMode;
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

export interface OrganizationContractTerms {
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  gracePeriodDays: number | null;
  autoRenew: boolean;
  /** The plan name as signed. */
  planName: string;
  /** Price and payment terms; null without billing.manage. */
  pricing: {
    agreedPrice: number;
    currency: string;
    paymentMethod: string;
    paymentFrequency: string;
  } | null;
  /** Set once the contract is terminated. */
  termination: {
    mode: string | null;
    terminatedAt: Date | null;
    accessEndsAt: Date | null;
  } | null;
}

export interface OrganizationUsageResponse {
  plan: {
    name: string;
    features: { analytics: boolean; importExport: boolean };
  };
  status: string;
  /** The contract in force: active, else the latest terminated/expired one. */
  contract: OrganizationContractTerms | null;
  /** Where the limits come from: the signed snapshot, or the live plan (legacy). */
  limits: {
    source: 'snapshot' | 'live';
    /** When the snapshot was taken (ISO), i.e. "as signed on". */
    capturedAt: string | null;
  };
  usage: {
    users: UsageMetric;
    leads: UsageMetric;
    projects: UsageMetric;
    storageBytes: UsageMetric;
  };
}
