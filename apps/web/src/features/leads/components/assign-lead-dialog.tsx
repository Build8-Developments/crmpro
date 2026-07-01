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
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";

export function AssignLeadDialog() {
  const assignDialog = useLeadUiStore((s) => s.assignDialog);
  const closeAssignDialog = useLeadUiStore((s) => s.closeAssignDialog);
  const { users } = useLeadFilterOptions();
  const assignLead = useAssignLead();
  const bulkAssign = useBulkAssignLeads();
  const { can } = usePermissions();
  const [userId, setUserId] = useState<string>("__unassigned__");

  const open = Boolean(assignDialog);
  const leadIds = assignDialog?.leadIds ?? [];
  const isBulk = leadIds.length > 1;
  const pending = assignLead.isPending || bulkAssign.isPending;

  const handleClose = () => {
    closeAssignDialog();
    setUserId("__unassigned__");
  };

  const handleSubmit = async () => {
    const targetUserId = userId === "__unassigned__" ? null : userId;

    if (leadIds.length === 0) {
      toast.error("No open leads selected for assignment");
      return;
    }

    try {
      if (isBulk) {
        await bulkAssign.mutateAsync({ leadIds, userId: targetUserId });
      } else if (leadIds[0]) {
        await assignLead.mutateAsync({
          leadId: leadIds[0],
          userId: targetUserId,
        });
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
            {isBulk ? `Assign ${leadIds.length} leads` : "Assign lead"}
          </DialogTitle>
          <DialogDescription>
            Choose an agent to own {isBulk ? "these leads" : "this lead"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Agent</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {(users.data ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {users.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading agents...</p>
          ) : null}
          {!users.isLoading && (users.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active agents found. Add users in Team settings.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={pending}>
            {pending ? "Saving..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
