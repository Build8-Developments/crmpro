"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/features/teams/hooks";
import { useRoles } from "@/features/users/hooks";
import { useInviteUser } from "@/features/users/mutations";

const NO_TEAM = "__none__";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("users.invite");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? <InviteUserForm onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function InviteUserForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations("users.invite");
  const tUsers = useTranslations("users");
  const tCommon = useTranslations("common");
  const inviteUser = useInviteUser();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: teams } = useTeams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [teamId, setTeamId] = useState(NO_TEAM);

  const valid =
    fullName.trim().length >= 2 && EMAIL_PATTERN.test(email.trim()) && roleId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    try {
      await inviteUser.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        roleId,
        ...(teamId !== NO_TEAM ? { teamId } : {}),
      });
      onClose();
    } catch {
      // toast shown by useApiMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-name">Full name</Label>
        <Input
          id="invite-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          minLength={2}
          maxLength={120}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
            <SelectTrigger id="invite-role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {(roles ?? []).map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {teams?.length ? (
          <div className="space-y-2">
            <Label htmlFor="invite-team">{tUsers("teamLabel")}</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="invite-team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEAM}>{tUsers("noTeam")}</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={!valid || inviteUser.isPending}>
          {inviteUser.isPending ? t("sending") : t("submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
