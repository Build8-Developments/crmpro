"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useUpdateProfileName } from "@/features/settings/mutations";
import { useCurrentUser } from "@/features/auth/hooks";
import type { AuthUser } from "@/types/auth";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";

export function ProfileSettingsCard() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <SettingsSection
        title="Profile"
        description="Your personal account details"
      >
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </SettingsSection>
    );
  }

  return <ProfileSettingsContent key={user.id + user.name} user={user} />;
}

function ProfileSettingsContent({ user }: { user: AuthUser }) {
  const { can } = usePermissions();
  const updateProfile = useUpdateProfileName();
  const [fullName, setFullName] = useState(user.name);
  const [editing, setEditing] = useState(false);

  const canEditName = can("user.update");
  const isDirty = fullName.trim() !== user.name && fullName.trim().length >= 2;

  const handleSave = async () => {
    if (!isDirty) return;
    await updateProfile.mutateAsync({
      userId: user.id,
      fullName: fullName.trim(),
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setFullName(user.name);
    setEditing(false);
  };

  return (
    <SettingsSection
      title="Profile"
      description="How you appear across the workspace"
      action={
        canEditName && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setEditing(true)}
          >
            Edit name
          </Button>
        ) : null
      }
    >
      <div className="flex items-center gap-3 rounded-lg bg-muted/35 px-3 py-3">
        <Avatar className="size-11">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name}
            </p>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {user.role.name}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Badge
          variant="outline"
          className="hidden h-5 shrink-0 px-1.5 text-[10px] sm:inline-flex"
        >
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {editing ? (
        <div className="space-y-3 rounded-lg border border-border/60 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-full-name">Display name</Label>
            <Input
              id="settings-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || updateProfile.isPending}
              onClick={() => void handleSave()}
            >
              {updateProfile.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60 sm:grid-cols-2">
        <MetaCell label="Phone" value={user.phone ?? "Not set"} />
        <MetaCell
          label="Last login"
          value={
            user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "—"
          }
        />
        <MetaCell label="Email" value={user.email} />
        <MetaCell label="Role" value={user.role.name} />
      </div>
    </SettingsSection>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
    </div>
  );
}
