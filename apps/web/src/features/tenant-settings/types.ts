export type SlaAction = "NOTIFY" | "REASSIGN";

export interface TenantSettings {
  tenantId: string;
  timezone: string;
  defaultCountryCode: string;
  currency: string;
  defaultLocale: "ar" | "en";
  autoAssignEnabled: boolean;
  slaFirstResponseMinutes: number | null;
  slaAction: SlaAction;
  logoFileAssetId: string | null;
  updatedAt: string;
  /** From the tenant record. */
  workspaceName: string;
  /** Short-lived signed URL. */
  logoUrl: string | null;
}

export type UpdateTenantSettingsInput = Partial<
  Omit<TenantSettings, "tenantId" | "updatedAt" | "logoUrl">
>;
