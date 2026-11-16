"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { FilterOption } from "@/features/leads/api";
import { useLead, useLeadFilterOptions } from "@/features/leads/hooks";
import { useUpdateLead } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import {
  ProjectInterestsField,
  toProjectInterestsInput,
  type ProjectInterestDraft,
} from "@/features/leads/components/project-interests-field";
import { usePermissions } from "@/hooks/use-permissions";

export function EditLeadDialog() {
  const editDialog = useLeadUiStore((s) => s.editDialog);
  const closeEditDialog = useLeadUiStore((s) => s.closeEditDialog);
  const { can } = usePermissions();
  const { sources, projects } = useLeadFilterOptions();
  const updateLead = useUpdateLead();

  const leadId = editDialog?.leadId;
  const open = Boolean(leadId);
  const { data: lead, isLoading, isError } = useLead(leadId);

  const [fullName, setFullName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sourceId, setSourceId] = useState<string>();
  const [projectInterests, setProjectInterests] = useState<
    ProjectInterestDraft[]
  >([]);

  // Include the lead's own projects so interests in projects outside the
  // option list (inactive, or beyond the first page) are still shown and kept.
  const projectOptions = useMemo(() => {
    const options = [...(projects.data ?? [])];
    const known = new Set(options.map((option) => option.id));
    for (const interest of lead?.projectInterests ?? []) {
      if (!known.has(interest.projectId)) {
        options.push({ id: interest.projectId, name: interest.project.name });
      }
    }
    return options;
  }, [projects.data, lead]);

  useEffect(() => {
    if (!open || !lead) return;

    setFullName(lead.fullName);
    setPrimaryPhone(lead.primaryPhone);
    setSecondaryPhone(lead.secondaryPhone ?? "");
    setEmail(lead.email ?? "");
    setSourceId(lead.source?.id);
    setProjectInterests(
      lead.projectInterests.map((interest) => ({
        projectId: interest.projectId,
        interestLevel: interest.interestLevel,
      })),
    );
  }, [open, lead]);

  const handleClose = () => {
    closeEditDialog();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!leadId) return;

    const trimmedSecondary = secondaryPhone.trim();
    const trimmedEmail = email.trim();

    await updateLead.mutateAsync({
      leadId,
      input: {
        fullName: fullName.trim(),
        primaryPhone: primaryPhone.trim(),
        secondaryPhone: trimmedSecondary.length > 0 ? trimmedSecondary : null,
        email: trimmedEmail.length > 0 ? trimmedEmail : null,
        sourceId: sourceId ?? null,
        projectInterests: toProjectInterestsInput(projectInterests),
      },
    });

    handleClose();
  };

  if (!can("lead.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>
            Update contact details and project interests.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isError || !lead ? (
          <p className="text-sm text-muted-foreground">
            This lead could not be loaded.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lead-fullName">Full name</Label>
              <Input
                id="edit-lead-fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-lead-primaryPhone">Primary phone</Label>
                <Input
                  id="edit-lead-primaryPhone"
                  value={primaryPhone}
                  onChange={(event) => setPrimaryPhone(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-secondaryPhone">Secondary phone</Label>
                <Input
                  id="edit-lead-secondaryPhone"
                  value={secondaryPhone}
                  onChange={(event) => setSecondaryPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lead-email">Email</Label>
              <Input
                id="edit-lead-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <SelectField
              label="Source"
              value={sourceId}
              options={sources.data ?? []}
              placeholder="No source"
              onChange={setSourceId}
            />

            <ProjectInterestsField
              value={projectInterests}
              options={projectOptions}
              onChange={setProjectInterests}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  updateLead.isPending ||
                  !fullName.trim() ||
                  !primaryPhone.trim()
                }
              >
                {updateLead.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder = "Select",
  disabled,
  onChange,
}: {
  label: string;
  value?: string;
  options: FilterOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value ?? "__none__"}
        disabled={disabled}
        onValueChange={(next) =>
          onChange(next === "__none__" ? undefined : next)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
