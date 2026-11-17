"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks";
import { uploadFile } from "@/features/files/upload";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useTenantSettings } from "@/features/tenant-settings/hooks";
import { useUpdateTenantSettings } from "@/features/tenant-settings/mutations";
import type { TenantSettings } from "@/features/tenant-settings/types";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const TIMEZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Amman",
  "Asia/Beirut",
  "Africa/Casablanca",
  "Europe/London",
  "UTC",
];

const COUNTRIES = [
  ["EG", "Egypt (+20)"],
  ["SA", "Saudi Arabia (+966)"],
  ["AE", "UAE (+971)"],
  ["KW", "Kuwait (+965)"],
  ["QA", "Qatar (+974)"],
  ["BH", "Bahrain (+973)"],
  ["OM", "Oman (+968)"],
  ["JO", "Jordan (+962)"],
  ["LB", "Lebanon (+961)"],
  ["MA", "Morocco (+212)"],
] as const;

const CURRENCIES = ["EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "USD", "EUR"];

export function WorkspaceSettingsCard() {
  const { data: user } = useCurrentUser();
  const { data: settings, isLoading } = useTenantSettings();

  if (!user?.tenant || isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <WorkspaceForm
      key={settings.updatedAt}
      settings={settings}
      slug={user.tenant.slug}
      status={user.tenant.status}
    />
  );
}

function WorkspaceForm({
  settings,
  slug,
  status,
}: {
  settings: TenantSettings;
  slug: string;
  status: string;
}) {
  const t = useTranslations("workspace");
  const { can } = usePermissions();
  const canEdit = can("tenant.manage");
  const update = useUpdateTenantSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(settings.workspaceName);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [country, setCountry] = useState(settings.defaultCountryCode);
  const [currency, setCurrency] = useState(settings.currency);
  const [language, setLanguage] = useState(settings.defaultLocale);

  const dirty =
    name.trim() !== settings.workspaceName ||
    timezone !== settings.timezone ||
    country !== settings.defaultCountryCode ||
    currency !== settings.currency ||
    language !== settings.defaultLocale;

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t("logoTooBig"));
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadFile(file, "TENANT_LOGO");
      await update.mutateAsync({ logoFileAssetId: asset.id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const links = [
    can("user.read") ? { href: "/users", label: "Team", icon: AppIcons.users } : null,
    can("role.read") ? { href: "/roles", label: "Roles", icon: AppIcons.roles } : null,
    can("pipeline.read")
      ? { href: "/pipelines", label: "Pipelines", icon: AppIcons.pipelines }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof AppIcons.users }>;

  return (
    <SettingsSection
      title={t("title")}
      description={t("description")}
      action={
        canEdit ? (
          <Button
            size="sm"
            className="h-8"
            disabled={!dirty || name.trim().length < 2 || update.isPending}
            onClick={() =>
              void update.mutateAsync({
                workspaceName: name.trim(),
                timezone,
                defaultCountryCode: country,
                currency,
                defaultLocale: language,
              })
            }
          >
            {update.isPending ? t("saving") : t("save")}
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img src={settings.logoUrl} alt="" className="size-full object-contain" />
            ) : (
              <AppIcons.building className="size-6 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium">{t("logo")}</p>
            <p className="text-xs text-muted-foreground">{t("logoHelp")}</p>
            {canEdit ? (
              <div className="flex gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(event) => void handleLogo(event.target.files?.[0])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <AppIcons.upload className="size-3.5" />
                  {uploading ? t("uploading") : t("uploadLogo")}
                </Button>
                {settings.logoFileAssetId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    disabled={update.isPending}
                    onClick={() => void update.mutateAsync({ logoFileAssetId: null })}
                  >
                    {t("removeLogo")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">{t("name")}</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEdit}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("slug")}</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3">
              <span className="font-mono text-sm">{slug}</span>
              <Badge variant="outline" className="ms-auto h-5 px-1.5 text-[10px] capitalize">
                {status.toLowerCase()}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{t("slugHelp")}</p>
          </div>
          <SettingSelect
            label={t("timezone")}
            value={timezone}
            onChange={setTimezone}
            disabled={!canEdit}
            options={TIMEZONES.map((zone) => [zone, zone])}
          />
          <SettingSelect
            label={t("country")}
            value={country}
            onChange={setCountry}
            disabled={!canEdit}
            options={COUNTRIES.map(([code, label]) => [code, label])}
          />
          <SettingSelect
            label={t("currency")}
            value={currency}
            onChange={setCurrency}
            disabled={!canEdit}
            options={CURRENCIES.map((code) => [code, code])}
          />
          <SettingSelect
            label={t("language")}
            value={language}
            onChange={(value) => setLanguage(value as "ar" | "en")}
            disabled={!canEdit}
            options={[
              ["ar", "العربية"],
              ["en", "English"],
            ]}
          />
        </div>

        {links.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("shortcuts")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}

function SettingSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<readonly [string, string]>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
