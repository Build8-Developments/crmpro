"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "@/components/crm/settings-section";
import { useUpdateMe } from "@/features/account/mutations";
import { useCurrentUser } from "@/features/auth/hooks";
import type { AuthUser } from "@/types/auth";
import { formatRelativeTime, getInitials } from "@/lib/format";

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
  const updateMe = useUpdateMe();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const nameChanged = trimmedName !== user.name;
  const phoneChanged = trimmedPhone !== (user.phone ?? "");
  const canSave =
    (nameChanged || phoneChanged) && trimmedName.length >= 2 && !updateMe.isPending;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    try {
      await updateMe.mutateAsync({
        ...(nameChanged ? { name: trimmedName } : {}),
        ...(phoneChanged ? { phone: trimmedPhone || null } : {}),
      });
    } catch {
      return; // the mutation hook already shows the error toast
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setName(user.name);
    setPhone(user.phone ?? "");
    setEditing(false);
  };

  return (
    <SettingsSection
      title="Profile"
      description="How you appear to your team"
      action={
        !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setEditing(true)}
          >
            Edit profile
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
      </div>

      {editing ? (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-lg border border-border/60 p-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Full name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-phone">Phone</Label>
              <Input
                id="account-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={30}
                placeholder="01xxxxxxxxx"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={!canSave}>
              {updateMe.isPending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
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
