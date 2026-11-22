"use client";

import { useMemo, useState } from "react";
import { IconCrown, IconDotsVertical, IconPlus } from "@tabler/icons-react";
import { AppIcons } from "@/components/icons/app-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteTeam } from "@/features/teams/api";
import { TeamFormDialog } from "@/features/teams/components/team-form-dialog";
import { TEAMS_QUERY_KEY, useTeams } from "@/features/teams/hooks";
import type { Team } from "@/features/teams/types";
import { useUsers } from "@/features/users/hooks";
import { usePermissions } from "@/hooks/use-permissions";
import { getInitials } from "@/lib/format";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const MAX_AVATARS = 6;

/**
 * Settings → Team → Teams. Teams group agents under a leader; a leader whose
 * role has lead.read-team sees the team's leads (and the unassigned pool).
 */
export function TeamsPage() {
  const { can } = usePermissions();
  const canManage = can("team.manage");
  const { data: teams, isLoading } = useTeams();
  const { data: usersPage } = useUsers({ limit: 100, isActive: true });
  const users = useMemo(() => usersPage?.items ?? [], [usersPage?.items]);

  const [editing, setEditing] = useState<Team | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Team | null>(null);

  const withoutTeam = users.filter((user) => !user.team);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (team: Team) => {
    setEditing(team);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5 px-4 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Teams</h1>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Group agents under a team leader. Agents see their own leads and unassigned ones; a
            leader whose role has &quot;See team&apos;s leads&quot; also sees their team&apos;s leads.
            Owners and managers see everything.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="size-4" />
            New team
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (teams ?? []).length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <AppIcons.team className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium">No teams yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Teams are optional. Create one when a group of agents reports to a team leader.
          </p>
          {canManage ? (
            <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
              <IconPlus className="size-4" />
              Create the first team
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(teams ?? []).map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canManage={canManage}
              onEdit={() => openEdit(team)}
              onDelete={() => setDeleting(team)}
            />
          ))}
        </div>
      )}

      {!isLoading && (teams ?? []).length > 0 && withoutTeam.length > 0 ? (
        <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <h2 className="text-sm font-semibold">Not in a team</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {withoutTeam.length} active {withoutTeam.length === 1 ? "person" : "people"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {withoutTeam.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 py-0.5 pr-2.5 pl-0.5 text-xs"
              >
                <Avatar size="sm" className="size-5">
                  <AvatarFallback className="text-[9px]">{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
                {user.fullName}
                <span className="text-muted-foreground">· {user.role.name}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <TeamFormDialog
        open={formOpen}
        team={editing}
        users={users}
        onClose={() => setFormOpen(false)}
      />
      <DeleteTeamDialog team={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function TeamCard({
  team,
  canManage,
  onEdit,
  onDelete,
}: {
  team: Team;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const members = team.members.filter((member) => member.id !== team.leader?.id);
  const shown = members.slice(0, MAX_AVATARS);

  return (
    <article className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AppIcons.team className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold" title={team.name}>
            {team.name}
          </h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="-mr-1.5 size-7" aria-label={`${team.name} actions`}>
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onEdit}>
                <AppIcons.edit className="size-4" />
                Edit team
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <AppIcons.trash className="size-4" />
                Delete team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
        <IconCrown className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        {team.leader ? (
          <span className="truncate">
            <span className="text-muted-foreground">Leader · </span>
            <span className="font-medium">{team.leader.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">No leader yet</span>
        )}
      </div>

      <div className="mt-3 flex min-h-7 flex-wrap items-center gap-1">
        {members.length === 0 ? (
          <span className="text-xs text-muted-foreground">No members yet</span>
        ) : (
          <>
            {shown.map((member) => (
              <Avatar key={member.id} size="sm" title={`${member.name} · ${member.role.name}`}>
                <AvatarFallback className="text-[10px]">{getInitials(member.name)}</AvatarFallback>
              </Avatar>
            ))}
            {members.length > shown.length ? (
              <span className="ml-1 text-xs text-muted-foreground tabular-nums">
                +{members.length - shown.length}
              </span>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function DeleteTeamDialog({ team, onClose }: { team: Team | null; onClose: () => void }) {
  const remove = useApiMutation({
    mutationFn: (id: string) => deleteTeam(id),
    successMessage: "Team deleted",
    invalidateKeys: [TEAMS_QUERY_KEY, ["users"]],
  });

  const confirm = async () => {
    if (!team) return;
    try {
      await remove.mutateAsync(team.id);
      onClose();
    } catch {
      // toast handled by useApiMutation
    }
  };

  return (
    <Dialog open={Boolean(team)} onOpenChange={(next) => !next && !remove.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {team?.name}?</DialogTitle>
          <DialogDescription>
            Its {team?.memberCount ?? 0} members stay in the organization without a team, and the
            leader stops seeing the team&apos;s leads. Leads and their assignments don&apos;t change.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={remove.isPending}>
            {remove.isPending ? "Deleting…" : "Delete team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
