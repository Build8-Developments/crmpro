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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { useAssignLead, useBulkAssignLeads } from "@/features/leads/mutations";
import { useLeadsTableStore } from "@/features/leads/stores/leads-table-store";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";

const UNASSIGNED = "__unassigned__";

export function AssignLeadDialog() {
  const assignDialog = useLeadUiStore((s) => s.assignDialog);
  const closeAssignDialog = useLeadUiStore((s) => s.closeAssignDialog);
  const clearRowSelection = useLeadsTableStore((s) => s.clearRowSelection);
  const { users } = useLeadFilterOptions();
  const assignLead = useAssignLead();
  const bulkAssign = useBulkAssignLeads();
  const { can } = usePermissions();
  const [userId, setUserId] = useState<string>(UNASSIGNED);

  const open = Boolean(assignDialog);
  const leadIds = assignDialog?.leadIds ?? [];
  const matching = assignDialog?.matching;
  const count = matching?.count ?? leadIds.length;
  const isBulk = Boolean(matching) || leadIds.length > 1;
  const pending = assignLead.isPending || bulkAssign.isPending;

  const handleClose = () => {
    closeAssignDialog();
    setUserId(UNASSIGNED);
  };

  const handleSubmit = async () => {
    const targetUserId = userId === UNASSIGNED ? null : userId;
    try {
      if (matching) {
        await bulkAssign.mutateAsync({
          selection: { filters: matching.filters },
          userId: targetUserId,
        });
        clearRowSelection();
      } else if (isBulk) {
        await bulkAssign.mutateAsync({ selection: { leadIds }, userId: targetUserId });
        clearRowSelection();
      } else if (leadIds[0]) {
        await assignLead.mutateAsync({ leadId: leadIds[0], userId: targetUserId });
      }
      handleClose();
    } catch {
      // Error toast is handled by useApiMutation
    }
  };

  if (!can("lead.assign")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Assign ${formatNumber(count)} leads` : "Assign lead"}
          </DialogTitle>
          <DialogDescription>
            {matching
              ? "Every lead matching the current filters goes to the person you pick. Their open next steps move with them."
              : `Choose who owns ${isBulk ? "these leads" : "this lead"}. Open next steps move with the lead.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Assign to</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {(users.data ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!users.isLoading && (users.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active team members. Add users in Settings → Team.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={pending}>
            {pending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
