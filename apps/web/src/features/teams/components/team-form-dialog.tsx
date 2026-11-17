"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/features/teams/hooks";
import { useCreateTeam, useUpdateTeam } from "@/features/teams/mutations";
import type { Team } from "@/features/teams/types";
import { useUsers } from "@/features/users/hooks";

const NO_LEADER = "__none__";

interface TeamFormDialogProps {
  open: boolean;
  team: Team | null;
  onClose: () => void;
}

export function TeamFormDialog({ open, team, onClose }: TeamFormDialogProps) {
  const t = useTranslations("teams.form");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <TeamForm key={team?.id ?? "new"} team={team} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TeamForm({ team, onClose }: { team: Team | null; onClose: () => void }) {
  const t = useTranslations("teams.form");
  const tTeams = useTranslations("teams");
  const tCommon = useTranslations("common");
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const { data: teams } = useTeams();
  const { data: usersPage, isLoading } = useUsers({
    limit: 100,
    isActive: true,
    sortBy: "name",
    sortOrder: "asc",
  });

  const [name, setName] = useState(team?.name ?? "");
  const [leaderUserId, setLeaderUserId] = useState<string>(
    team?.leader?.id ?? NO_LEADER,
  );
  const [memberIds, setMemberIds] = useState<Set<string>>(
    () => new Set(team?.members.map((member) => member.id) ?? []),
  );
  const [search, setSearch] = useState("");

  const users = useMemo(() => usersPage?.items ?? [], [usersPage]);
  const teamNameByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const other of teams ?? []) {
      if (other.id === team?.id) continue;
      for (const member of other.members) map.set(member.id, other.name);
    }
    return map;
  }, [teams, team?.id]);

  const visibleUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    return (
      query.length === 0 ||
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const toggleMember = (userId: string) => {
    setMemberIds((previous) => {
      const next = new Set(previous);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const pending = createTeam.isPending || updateTeam.isPending;
  const leader = leaderUserId === NO_LEADER ? null : leaderUserId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;

    try {
      if (team) {
        await updateTeam.mutateAsync({
          id: team.id,
          details: { name: trimmed, leaderUserId: leader },
          memberIds: [...memberIds],
        });
      } else {
        await createTeam.mutateAsync({
          name: trimmed,
          leaderUserId: leader,
          memberIds: [...memberIds],
        });
      }
      onClose();
    } catch {
      // toast already shown by useApiMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-name">{t("nameLabel")}</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("namePlaceholder")}
          minLength={2}
          maxLength={80}
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="team-leader">{t("leaderLabel")}</Label>
        <Select
          value={leaderUserId}
          onValueChange={setLeaderUserId}
          disabled={isLoading}
        >
          <SelectTrigger id="team-leader">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LEADER}>
              {tTeams("noLeader")}
            </SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName} · {user.role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("membersLabel")}</Label>
          <span className="text-xs text-muted-foreground">
            {t("selectedCount", { count: memberIds.size })}
          </span>
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchMembers")}
        />
        <ScrollArea className="h-56 rounded-md border border-border/60">
          <ul className="divide-y divide-border/50">
            {visibleUsers.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                {t("noUsers")}
              </li>
            ) : (
              visibleUsers.map((user) => {
                const otherTeam = teamNameByUser.get(user.id);
                return (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                      <Checkbox
                        checked={memberIds.has(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {user.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.role.name} · {user.email}
                        </span>
                      </span>
                      {otherTeam ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {t("currentTeam", { team: otherTeam })}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={pending || name.trim().length < 2}>
          {pending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
