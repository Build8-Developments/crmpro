"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRevokeApiKey } from "@/features/api-keys/hooks";
import type { ApiKey } from "@/features/api-keys/types";

export function RevokeApiKeyDialog({ apiKey, onClose }: { apiKey: ApiKey | null; onClose: () => void }) {
  const revoke = useRevokeApiKey();

  const confirm = async () => {
    if (!apiKey) return;
    try {
      await revoke.mutateAsync(apiKey.id);
      onClose();
    } catch {
      // toast handled by useApiMutation
    }
  };

  return (
    <Dialog open={Boolean(apiKey)} onOpenChange={(next) => !next && !revoke.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke {apiKey?.name}?</DialogTitle>
          <DialogDescription>
            Anything still using this key (<span className="font-mono">{apiKey?.prefix}…</span>) stops
            sending leads immediately. This can&apos;t be undone; you can create a new key at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={revoke.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={revoke.isPending}>
            {revoke.isPending ? "Revoking…" : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
