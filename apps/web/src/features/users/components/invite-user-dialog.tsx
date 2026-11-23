"use client";

import { useState } from "react";
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
import { useUserUiStore } from "@/features/users/stores/user-ui-store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invite by email: the person chooses their own password from the link. */
export function InviteUserDialog() {
  const open = useUserUiStore((s) => s.inviteDialogOpen);
  const close = useUserUiStore((s) => s.closeInviteDialog);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">{open ? <InviteForm onClose={close} /> : null}</DialogContent>
    </Dialog>
  );
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const invite = useInviteUser();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: teams } = useTeams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [teamId, setTeamId] = useState("none");

  const valid = fullName.trim().length >= 2 && EMAIL.test(email.trim()) && Boolean(roleId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    try {
      await invite.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        roleId,
        ...(teamId !== "none" ? { teamId } : {}),
      });
      onClose();
    } catch {
      // toast handled by the mutation
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Invite by email</DialogTitle>
        <DialogDescription>
          They get a link to choose their own password. It works once and expires in 7 days.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="invite-name">Full name</Label>
        <Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@agency.com"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
            <SelectTrigger id="invite-role" className="w-full">
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
        {teams && teams.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="invite-team">Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="invite-team" className="w-full">
                <SelectValue placeholder="No team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
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
          Cancel
        </Button>
        <Button type="submit" disabled={!valid || invite.isPending}>
          {invite.isPending ? "Sending…" : "Send invitation"}
        </Button>
      </DialogFooter>
    </form>
  );
}
