"use client";

import { useState } from "react";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
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
import {
  useCreatePlan,
  useUpdatePlan,
} from "@/features/plans/mutations";
import {
  PLAN_CURRENCY_OPTIONS,
  PLAN_FEATURE_FLAG_OPTIONS,
  type CreatePlanInput,
  type PlanListItem,
  type UpdatePlanInput,
} from "@/features/plans/types";
import { usePermissions } from "@/hooks/use-permissions";

interface PlanFormDialogProps {
  open: boolean;
  plan?: PlanListItem | null;
  onClose: () => void;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNullableNumber(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function gbToBytes(gb: string): number | null | undefined {
  const parsed = parseNullableNumber(gb);
  if (parsed === undefined) return undefined;
  if (parsed === null) return null;
  return Math.round(parsed * 1024 * 1024 * 1024);
}

function bytesToGb(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "";
  const gb = bytes / (1024 * 1024 * 1024);
  return gb % 1 === 0 ? String(gb) : gb.toFixed(2);
}

export function PlanFormDialog({ open, plan, onClose }: PlanFormDialogProps) {
  const { can } = usePermissions();
  const isEdit = Boolean(plan);
  const canOpen = isEdit
    ? can(ADMIN_PERMISSIONS.PLAN_UPDATE)
    : can(ADMIN_PERMISSIONS.PLAN_CREATE);

  if (!canOpen) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update pricing, limits, and feature flags for this template."
              : "Define a subscription template with pricing, limits, and features."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PlanForm
            key={plan?.id ?? "create-plan"}
            plan={plan}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PlanForm({
  plan,
  onClose,
}: {
  plan?: PlanListItem | null;
  onClose: () => void;
}) {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isEdit = Boolean(plan);
  const isPending = createPlan.isPending || updatePlan.isPending;

  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [defaultPrice, setDefaultPrice] = useState(
    plan?.defaultPrice != null ? String(plan.defaultPrice) : "",
  );
  const [currency, setCurrency] = useState(plan?.currency ?? "EGP");
  const [maxUsers, setMaxUsers] = useState(
    plan?.maxUsers != null ? String(plan.maxUsers) : "",
  );
  const [maxLeads, setMaxLeads] = useState(
    plan?.maxLeads != null ? String(plan.maxLeads) : "",
  );
  const [maxProjects, setMaxProjects] = useState(
    plan?.maxProjects != null ? String(plan.maxProjects) : "",
  );
  const [maxStorageGb, setMaxStorageGb] = useState(
    bytesToGb(plan?.maxStorageBytes),
  );
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const option of PLAN_FEATURE_FLAG_OPTIONS) {
        initial[option.key] = Boolean(plan?.featureFlags?.[option.key]);
      }
      return initial;
    },
  );

  const toggleFlag = (key: string, checked: boolean) => {
    setFeatureFlags((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;

    const price = parseOptionalNumber(defaultPrice);
    const storageBytes = gbToBytes(maxStorageGb);

    if (isEdit && plan) {
      const input: UpdatePlanInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultPrice: parseNullableNumber(defaultPrice) ?? null,
        currency: currency || null,
        maxUsers: parseNullableNumber(maxUsers) ?? null,
        maxLeads: parseNullableNumber(maxLeads) ?? null,
        maxProjects: parseNullableNumber(maxProjects) ?? null,
        maxStorageBytes: storageBytes === undefined ? null : storageBytes,
        featureFlags,
      };
      await updatePlan.mutateAsync({ planId: plan.id, input });
    } else {
      const input: CreatePlanInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultPrice: price,
        currency: currency || undefined,
        maxUsers: parseOptionalNumber(maxUsers) ?? undefined,
        maxLeads: parseOptionalNumber(maxLeads) ?? undefined,
        maxProjects: parseOptionalNumber(maxProjects) ?? undefined,
        maxStorageBytes: storageBytes === null ? undefined : storageBytes,
        featureFlags,
      };
      await createPlan.mutateAsync(input);
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plan-name">Name</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={100}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-description">Description</Label>
        <textarea
          id="plan-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={3}
          className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="plan-price">Default price</Label>
          <Input
            id="plan-price"
            type="number"
            min={0}
            step="0.01"
            value={defaultPrice}
            onChange={(event) => setDefaultPrice(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="plan-currency">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {PLAN_CURRENCY_OPTIONS.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="plan-max-users">Max users</Label>
          <Input
            id="plan-max-users"
            type="number"
            min={1}
            value={maxUsers}
            onChange={(event) => setMaxUsers(event.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-max-leads">Max leads</Label>
          <Input
            id="plan-max-leads"
            type="number"
            min={1}
            value={maxLeads}
            onChange={(event) => setMaxLeads(event.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-max-projects">Max projects</Label>
          <Input
            id="plan-max-projects"
            type="number"
            min={1}
            value={maxProjects}
            onChange={(event) => setMaxProjects(event.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-max-storage">Max storage (GB)</Label>
          <Input
            id="plan-max-storage"
            type="number"
            min={0}
            step="0.1"
            value={maxStorageGb}
            onChange={(event) => setMaxStorageGb(event.target.value)}
            placeholder="Unlimited"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Feature flags</Label>
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          {PLAN_FEATURE_FLAG_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                checked={Boolean(featureFlags[option.key])}
                onCheckedChange={(checked) =>
                  toggleFlag(option.key, checked === true)
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || name.trim().length < 2}
        >
          {isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save changes"
              : "Create plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
