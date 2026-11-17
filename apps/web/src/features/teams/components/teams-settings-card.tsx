"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useTeams } from "@/features/teams/hooks";
import { useDeleteTeam } from "@/features/teams/mutations";
import type { Team } from "@/features/teams/types";
import { usePermissions } from "@/hooks/use-permissions";
import { TeamFormDialog } from "./team-form-dialog";

export function TeamsSettingsCard() {
  const t = useTranslations("teams");
  const { can } = usePermissions();
  const canManage = can("team.manage");
  const { data: teams, isLoading } = useTeams();
  const [editing, setEditing] = useState<Team | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Team | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditing(team);
    setFormOpen(true);
  };

  return (
    <SettingsSection
      title={t("title")}
      description={t("description")}
      action={
        canManage ? (
          <Button size="sm" onClick={openCreate}>
            <AppIcons.create className="size-4" />
            {t("newTeam")}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !teams?.length ? (
        <div className="rounded-lg border border-dashed border-border/70 px-6 py-10 text-center">
          <AppIcons.users className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{team.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t("leader")}: {team.leader?.name ?? t("noLeader")} ·{" "}
                  {t("members", { count: team.memberCount })}
                </p>
              </div>
              {canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("edit")}
                    onClick={() => openEdit(team)}
                  >
                    <AppIcons.edit className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("delete")}
                    onClick={() => setDeleting(team)}
                  >
                    <AppIcons.trash className="size-4 text-destructive" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <TeamFormDialog
        open={formOpen}
        team={editing}
        onClose={() => setFormOpen(false)}
      />
      <DeleteTeamDialog team={deleting} onClose={() => setDeleting(null)} />
    </SettingsSection>
  );
}

function DeleteTeamDialog({
  team,
  onClose,
}: {
  team: Team | null;
  onClose: () => void;
}) {
  const t = useTranslations("teams.deleteDialog");
  const tCommon = useTranslations("common");
  const deleteTeam = useDeleteTeam();

  const handleConfirm = async () => {
    if (!team) return;
    try {
      await deleteTeam.mutateAsync(team.id);
      onClose();
    } catch {
      // toast already shown
    }
  };

  return (
    <Dialog open={team !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: team?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteTeam.isPending}
          >
            {deleteTeam.isPending ? tCommon("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
