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
  updatedAt: string;
}

export type UpdateTenantSettingsInput = Partial<
  Omit<TenantSettings, "tenantId" | "updatedAt">
>;
