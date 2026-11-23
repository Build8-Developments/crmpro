"use client";

import { useMemo, useState } from "react";
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
import {
  getDefaultPipelinePlacement,
  type FilterOption,
} from "@/features/leads/api";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { useCreateLead } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import {
  ProjectInterestsField,
  toProjectInterestsInput,
  type ProjectInterestDraft,
} from "@/features/leads/components/project-interests-field";
import { usePermissions } from "@/hooks/use-permissions";
import { CustomFieldsFormSection } from "@/features/custom-fields/components/custom-field-inputs";
import { useCustomFields } from "@/features/custom-fields/hooks";
import {
  customFieldErrorsFromApi,
  customFieldsInput,
  validateCustomFieldDraft,
  type CustomFieldDraft,
  type CustomFieldErrors,
} from "@/features/custom-fields/utils/custom-field-values";
import {
  EMPTY_PROFILE_DRAFT,
  LeadProfileFields,
  profileBudgetError,
  profileDraftToInput,
  type LeadProfileDraft,
} from "./lead-profile-fields";

export function CreateLeadDialog() {
  const open = useLeadUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useLeadUiStore((s) => s.closeCreateDialog);
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const { can } = usePermissions();
  const { pipelines, sources, users, projects } = useLeadFilterOptions();
  const createLeadMutation = useCreateLead();
  const { data: customFieldData } = useCustomFields();
  const customFields = customFieldData ?? [];

  const [fullName, setFullName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<LeadProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [sourceId, setSourceId] = useState<string>();
  const [assignedUserId, setAssignedUserId] = useState<string>();
  const [projectInterests, setProjectInterests] = useState<
    ProjectInterestDraft[]
  >([]);
  const [pipelineId, setPipelineId] = useState<string>();
  const [pipelineStageId, setPipelineStageId] = useState<string>();
  const [customDraft, setCustomDraft] = useState<CustomFieldDraft>({});
  const [customErrors, setCustomErrors] = useState<CustomFieldErrors>({});

  const pipelineOptions = pipelines.data ?? [];

  const stageOptions = useMemo(() => {
    if (!pipelineId) return [];
    return (
      pipelineOptions
        .find((pipeline) => pipeline.id === pipelineId)
        // New leads start in an open stage (Won needs a deal, Lost a reason).
        ?.stages.filter((stage) => !stage.isClosed)
        .map((stage) => ({ id: stage.id, name: stage.name })) ?? []
    );
  }, [pipelineId, pipelineOptions]);

  // Default placement once per opening, as soon as pipelines are loaded
  // (during render, not in an effect).
  const placementReady = open && pipelineOptions.length > 0;
  const [placedForOpen, setPlacedForOpen] = useState(false);
  if (placementReady && !placedForOpen) {
    setPlacedForOpen(true);
    const placement = getDefaultPipelinePlacement(pipelineOptions);
    if (placement) {
      setPipelineId(placement.pipelineId);
      setPipelineStageId(placement.pipelineStageId);
    }
  } else if (!open && placedForOpen) {
    setPlacedForOpen(false);
  }

  const resetForm = () => {
    setFullName("");
    setPrimaryPhone("");
    setSecondaryPhone("");
    setEmail("");
    setProfile(EMPTY_PROFILE_DRAFT);
    setSourceId(undefined);
    setAssignedUserId(undefined);
    setProjectInterests([]);
    setCustomDraft({});
    setCustomErrors({});
  };

  /** Editing a field clears its error; the others stay until fixed. */
  const handleCustomChange = (draft: CustomFieldDraft) => {
    setCustomErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => draft[key] === customDraft[key]),
      ),
    );
    setCustomDraft(draft);
  };

  const handleClose = () => {
    closeCreateDialog();
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pipelineId || !pipelineStageId) return;

    const errors = validateCustomFieldDraft(customFields, customDraft, {
      checkRequired: true,
    });
    setCustomErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const customFieldValues = customFieldsInput(customFields, customDraft);

    let result;
    try {
      result = await createLeadMutation.mutateAsync({
        fullName: fullName.trim(),
        primaryPhone: primaryPhone.trim(),
        secondaryPhone: secondaryPhone.trim() || null,
        email: email.trim() || null,
        ...profileDraftToInput(profile),
        pipelineId,
        pipelineStageId,
        ...(sourceId ? { sourceId } : {}),
        ...(assignedUserId ? { assignedUserId } : {}),
        ...(projectInterests.length > 0
          ? { projectInterests: toProjectInterestsInput(projectInterests) }
          : {}),
        ...(customFieldValues ? { customFields: customFieldValues } : {}),
      });
    } catch (error) {
      // The toast says what is wrong; also point at the fields.
      const fieldErrors = customFieldErrorsFromApi(error);
      if (fieldErrors) setCustomErrors(fieldErrors);
      return;
    }

    handleClose();
    openDrawer(result.lead.id);
  };

  if (!can("lead.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>
            Name and phone are enough to start — the rest helps your team sell.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-fullName">Full name</Label>
            <Input
              id="lead-fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={2}
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                inputMode="tel"
                value={primaryPhone}
                onChange={(event) => setPrimaryPhone(event.target.value)}
                placeholder="01xxxxxxxxx"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone-2">Second phone</Label>
              <Input
                id="lead-phone-2"
                inputMode="tel"
                value={secondaryPhone}
                onChange={(event) => setSecondaryPhone(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Pipeline"
              value={pipelineId}
              options={pipelineOptions}
              onChange={(value) => {
                setPipelineId(value);
                const pipeline = pipelineOptions.find(
                  (item) => item.id === value,
                );
                const firstStage = [...(pipeline?.stages ?? [])].sort(
                  (a, b) => a.sortOrder - b.sortOrder,
                )[0];
                setPipelineStageId(firstStage?.id);
              }}
            />
            <SelectField
              label="Stage"
              value={pipelineStageId}
              options={stageOptions}
              disabled={!pipelineId}
              onChange={setPipelineStageId}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Source"
              value={sourceId}
              options={sources.data ?? []}
              placeholder="Optional"
              onChange={setSourceId}
            />
            <SelectField
              label="Agent"
              value={assignedUserId}
              options={users.data ?? []}
              placeholder="Unassigned"
              onChange={setAssignedUserId}
            />
          </div>

          <ProjectInterestsField
            value={projectInterests}
            options={projects.data ?? []}
            onChange={setProjectInterests}
          />

          <details className="group rounded-lg border bg-muted/20 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium">
              Client profile
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                Job, area, budget, payment, best way to reach
              </span>
            </summary>
            <div className="border-t px-3 py-3">
              <LeadProfileFields value={profile} onChange={setProfile} />
            </div>
          </details>

          <CustomFieldsFormSection
            idPrefix="create-lead-custom"
            fields={customFields}
            value={customDraft}
            errors={customErrors}
            onChange={handleCustomChange}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createLeadMutation.isPending ||
                !fullName.trim() ||
                !primaryPhone.trim() ||
                Boolean(profileBudgetError(profile)) ||
                !pipelineId ||
                !pipelineStageId
              }
            >
              {createLeadMutation.isPending ? "Creating..." : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
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
