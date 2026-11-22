"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createTeam, setTeamMembers, updateTeam } from "@/features/teams/api";
import { TEAMS_QUERY_KEY } from "@/features/teams/hooks";
import type { Team } from "@/features/teams/types";
import type { UserListItem } from "@/features/users/types";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cn } from "@/lib/utils";

const NO_LEADER = "none";

interface TeamFormDialogProps {
  open: boolean;
  /** Team to edit; null creates a new one. */
  team: Team | null;
  users: UserListItem[];
  onClose: () => void;
}

export function TeamFormDialog({ open, team, users, onClose }: TeamFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          // Keyed so the form starts fresh for each team / each opening.
          <TeamForm key={team?.id ?? "new"} team={team} users={users} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TeamForm({
  team,
  users,
  onDone,
}: {
  team: Team | null;
  users: UserListItem[];
  onDone: () => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [leaderId, setLeaderId] = useState(team?.leader?.id ?? NO_LEADER);
  const [memberIds, setMemberIds] = useState<Set<string>>(
    () => new Set(team?.members.map((member) => member.id) ?? []),
  );
  const [search, setSearch] = useState("");

  const save = useApiMutation({
    mutationFn: async () => {
      const leaderUserId = leaderId === NO_LEADER ? null : leaderId;
      // A leader is always part of their own team.
      const members = new Set(memberIds);
      if (leaderUserId) members.add(leaderUserId);
      if (!team) {
        return createTeam({ name: name.trim(), leaderUserId, memberIds: [...members] });
      }
      await updateTeam(team.id, { name: name.trim(), leaderUserId });
      return setTeamMembers(team.id, [...members]);
    },
    successMessage: team ? "Team updated" : "Team created",
    invalidateKeys: [TEAMS_QUERY_KEY, ["users"]],
  });

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        !term ||
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  }, [users, search]);

  const toggle = (userId: string) =>
    setMemberIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    try {
      await save.mutateAsync(undefined);
      onDone();
    } catch {
      // toast handled by useApiMutation
    }
  };

  const selectedCount = new Set([
    ...memberIds,
    ...(leaderId === NO_LEADER ? [] : [leaderId]),
  ]).size;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{team ? `Edit ${team.name}` : "New team"}</DialogTitle>
        <DialogDescription>
          The leader sees the team&apos;s leads when their role has &quot;See team&apos;s leads&quot;.
          Someone can be in one team at a time.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="team-name">Name</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. New Cairo team"
            maxLength={80}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-leader">Leader</Label>
          <Select value={leaderId} onValueChange={setLeaderId}>
            <SelectTrigger id="team-leader" className="w-full">
              <SelectValue placeholder="No leader" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEADER}>No leader</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="team-member-search">Members</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{selectedCount} selected</span>
        </div>
        <Input
          id="team-member-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people"
          className="h-8"
        />
        <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60">
          {visibleUsers.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">No one matches.</li>
          ) : (
            visibleUsers.map((user) => {
              const isLeader = leaderId === user.id;
              const checked = isLeader || memberIds.has(user.id);
              const otherTeam = user.team && user.team.id !== team?.id ? user.team : null;
              return (
                <li key={user.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors duration-fast hover:bg-muted/50",
                      isLeader && "cursor-default",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isLeader}
                      onCheckedChange={() => toggle(user.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{user.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.role.name}
                        {isLeader ? " · Leader" : null}
                        {otherTeam && checked && !isLeader
                          ? ` · moves from ${otherTeam.name}`
                          : otherTeam
                            ? ` · in ${otherTeam.name}`
                            : null}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || name.trim().length < 2}>
          {save.isPending ? "Saving…" : team ? "Save changes" : "Create team"}
        </Button>
      </DialogFooter>
    </form>
  );
}
