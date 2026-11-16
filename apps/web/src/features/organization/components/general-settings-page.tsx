"use client";

import { useRef, useState } from "react";
import { SettingsSection } from "@/components/crm/settings-section";
import { SettingsPageBody } from "@/components/crm/settings-shell";
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
import {
  LOGO_CONTENT_TYPES,
  LOGO_MAX_BYTES,
  useOrganization,
  useRemoveLogo,
  useUpdateOrganizationName,
  useUpdateOrganizationSettings,
  useUploadLogo,
} from "@/features/organization/hooks";
import type {
  Organization,
  UpdateOrganizationSettingsInput,
} from "@/features/organization/types";
import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  WEEK_START_OPTIONS,
  getTimezoneOptions,
  labelForCountry,
} from "@/features/organization/utils/locale-options";
import { usePermissions } from "@/hooks/use-permissions";
import { getInitials } from "@/lib/format";
import { toast } from "@/lib/toast";

export function GeneralSettingsPage() {
  const { data: organization, isLoading, isError, refetch } = useOrganization();
  const { can } = usePermissions();
  const canManage = can("settings.manage");

  return (
    <SettingsPageBody>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !organization ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          Organization settings could not be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {!canManage ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              You can view these settings. Ask your workspace owner to change
              them.
            </p>
          ) : null}
          <IdentitySection organization={organization} canManage={canManage} />
          <RegionalSection
            key={organization.settings.updatedAt}
            organization={organization}
            canManage={canManage}
          />
        </>
      )}
    </SettingsPageBody>
  );
}

function IdentitySection({
  organization,
  canManage,
}: {
  organization: Organization;
  canManage: boolean;
}) {
  const [name, setName] = useState(organization.name);
  const updateName = useUpdateOrganizationName();
  const uploadLogo = useUploadLogo();
  const removeLogo = useRemoveLogo();
  const fileInput = useRef<HTMLInputElement>(null);

  const trimmed = name.trim();
  const nameDirty = trimmed !== organization.name && trimmed.length >= 2;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_CONTENT_TYPES.includes(file.type)) {
      toast.error("Logo must be a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Logo must be 2 MB or smaller");
      return;
    }
    // Errors are surfaced by the mutation hook's toast.
    uploadLogo.mutate(file);
  };

  return (
    <SettingsSection
      title="Organization"
      description="Your agency's name and logo, shown to your team and on the sign-in page"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
          {organization.logoUrl ? (
            // Signed, short-lived URL from our storage; next/image would need
            // the bucket host configured.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.logoUrl}
              alt={`${organization.name} logo`}
              className="size-full object-contain"
            />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">
              {getInitials(organization.name)}
            </span>
          )}
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={LOGO_CONTENT_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadLogo.isPending}
              onClick={() => fileInput.current?.click()}
            >
              {uploadLogo.isPending
                ? "Uploading..."
                : organization.logoUrl
                  ? "Replace logo"
                  : "Upload logo"}
            </Button>
            {organization.logoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removeLogo.isPending}
                onClick={() => removeLogo.mutate(undefined)}
              >
                Remove
              </Button>
            ) : null}
            <p className="w-full text-xs text-muted-foreground">
              PNG, JPEG or WebP, up to 2 MB. A square image works best.
            </p>
          </div>
        ) : null}
      </div>

      <form
        className="grid gap-3 lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (nameDirty) updateName.mutate(trimmed);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Organization name</Label>
          <div className="flex gap-2">
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canManage}
              minLength={2}
              maxLength={100}
            />
            {canManage ? (
              <Button
                type="submit"
                disabled={!nameDirty || updateName.isPending}
              >
                Save
              </Button>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-slug">Workspace ID</Label>
          <Input
            id="org-slug"
            value={organization.slug}
            readOnly
            disabled
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Your team uses this to sign in. Contact support to change it.
          </p>
        </div>
      </form>
    </SettingsSection>
  );
}

function RegionalSection({
  organization,
  canManage,
}: {
  organization: Organization;
  canManage: boolean;
}) {
  const saved = organization.settings;
  const [draft, setDraft] = useState({
    countryCode: saved.countryCode,
    timezone: saved.timezone,
    currency: saved.currency,
    weekStartsOn: saved.weekStartsOn,
  });
  const updateSettings = useUpdateOrganizationSettings();

  const changes: UpdateOrganizationSettingsInput = {};
  if (draft.countryCode !== saved.countryCode)
    changes.countryCode = draft.countryCode;
  if (draft.timezone !== saved.timezone) changes.timezone = draft.timezone;
  if (draft.currency !== saved.currency) changes.currency = draft.currency;
  if (draft.weekStartsOn !== saved.weekStartsOn)
    changes.weekStartsOn = draft.weekStartsOn;
  const dirty = Object.keys(changes).length > 0;

  const countryOptions = COUNTRY_OPTIONS.some(
    (option) => option.value === draft.countryCode,
  )
    ? COUNTRY_OPTIONS
    : [
        { value: draft.countryCode, label: labelForCountry(draft.countryCode) },
        ...COUNTRY_OPTIONS,
      ];
  const currencyOptions = CURRENCY_OPTIONS.some(
    (option) => option.value === draft.currency,
  )
    ? CURRENCY_OPTIONS
    : [{ value: draft.currency, label: draft.currency }, ...CURRENCY_OPTIONS];
  const timezones = getTimezoneOptions(draft.timezone);

  return (
    <SettingsSection
      title="Region & formats"
      description="Used for phone numbers, prices, and what counts as “today” in reports and reminders"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty) updateSettings.mutate(changes);
        }}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <Field
            label="Country"
            hint="Phone numbers without a country code are treated as this country."
          >
            <SimpleSelect
              label="Country"
              value={draft.countryCode}
              disabled={!canManage}
              options={countryOptions}
              onChange={(countryCode) => setDraft({ ...draft, countryCode })}
            />
          </Field>
          <Field label="Time zone">
            <SimpleSelect
              label="Time zone"
              value={draft.timezone}
              disabled={!canManage}
              options={timezones.map((zone) => ({
                value: zone,
                label: zone.replace(/_/g, " "),
              }))}
              onChange={(timezone) => setDraft({ ...draft, timezone })}
            />
          </Field>
          <Field label="Currency">
            <SimpleSelect
              label="Currency"
              value={draft.currency}
              disabled={!canManage}
              options={currencyOptions}
              onChange={(currency) => setDraft({ ...draft, currency })}
            />
          </Field>
          <Field label="Week starts on">
            <SimpleSelect
              label="Week starts on"
              value={String(draft.weekStartsOn)}
              disabled={!canManage}
              options={WEEK_START_OPTIONS.map((option) => ({
                value: String(option.value),
                label: option.label,
              }))}
              onChange={(value) =>
                setDraft({ ...draft, weekStartsOn: Number(value) })
              }
            />
          </Field>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={!dirty || updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save changes"}
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setDraft({
                    countryCode: saved.countryCode,
                    timezone: saved.timezone,
                    currency: saved.currency,
                    weekStartsOn: saved.weekStartsOn,
                  })
                }
              >
                Discard
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>
    </SettingsSection>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SimpleSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
