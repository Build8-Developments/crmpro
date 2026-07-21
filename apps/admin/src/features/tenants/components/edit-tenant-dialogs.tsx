"use client";

import { useState } from "react";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
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
  useUpdateTenantDetails,
  useUpdateTenantOwner,
} from "@/features/tenants/mutations";
import type { TenantDetail } from "@/features/tenants/types";
import { usePermissions } from "@/hooks/use-permissions";

interface EditTenantDialogProps {
  tenant: TenantDetail;
  open: boolean;
  onClose: () => void;
}

export function EditTenantDialog({
  tenant,
  open,
  onClose,
}: EditTenantDialogProps) {
  const { can } = usePermissions();
  if (!can(ADMIN_PERMISSIONS.TENANT_UPDATE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit tenant</DialogTitle>
          <DialogDescription>
            Update the agency display name. Slug stays fixed.
          </DialogDescription>
        </DialogHeader>
        <EditTenantForm key={tenant.id} tenant={tenant} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function EditTenantForm({
  tenant,
  onClose,
}: {
  tenant: TenantDetail;
  onClose: () => void;
}) {
  const updateDetails = useUpdateTenantDetails();
  const [name, setName] = useState(tenant.name);
  const hasChanges = name.trim() !== tenant.name;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || !hasChanges) return;
    await updateDetails.mutateAsync({
      tenantId: tenant.id,
      input: { name: trimmed },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-tenant-name">Agency name</Label>
        <Input
          id="edit-tenant-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={150}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Slug: <code className="rounded bg-muted px-1 py-0.5">{tenant.slug}</code>
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateDetails.isPending || name.trim().length < 2 || !hasChanges
          }
        >
          {updateDetails.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface EditTenantOwnerDialogProps {
  tenant: TenantDetail;
  open: boolean;
  onClose: () => void;
}

export function EditTenantOwnerDialog({
  tenant,
  open,
  onClose,
}: EditTenantOwnerDialogProps) {
  const { can } = usePermissions();
  if (!can(ADMIN_PERMISSIONS.TENANT_UPDATE) || !tenant.ownerUser) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit owner</DialogTitle>
          <DialogDescription>
            Update the primary account name or email for this agency.
          </DialogDescription>
        </DialogHeader>
        <EditOwnerForm
          key={tenant.ownerUser.id}
          tenantId={tenant.id}
          owner={tenant.ownerUser}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditOwnerForm({
  tenantId,
  owner,
  onClose,
}: {
  tenantId: string;
  owner: { id: string; fullName: string; email: string };
  onClose: () => void;
}) {
  const updateOwner = useUpdateTenantOwner();
  const [fullName, setFullName] = useState(owner.fullName);
  const [email, setEmail] = useState(owner.email);

  const hasChanges =
    fullName.trim() !== owner.fullName ||
    email.trim().toLowerCase() !== owner.email.toLowerCase();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !hasChanges) return;

    await updateOwner.mutateAsync({
      tenantId,
      input: {
        fullName: trimmedName,
        email: trimmedEmail,
      },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-owner-name">Full name</Label>
        <Input
          id="edit-owner-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-owner-email">Email</Label>
        <Input
          id="edit-owner-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateOwner.isPending ||
            fullName.trim().length < 2 ||
            !email.trim() ||
            !hasChanges
          }
        >
          {updateOwner.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
