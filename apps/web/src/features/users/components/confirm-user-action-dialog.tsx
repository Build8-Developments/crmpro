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
import {
  useDeactivateUser,
  useRevokeUserSessions,
} from "@/features/users/mutations";
import {
  type ConfirmUserActionKind,
  useUserUiStore,
} from "@/features/users/stores/user-ui-store";

const COPY: Record<
  ConfirmUserActionKind,
  {
    title: (name: string) => string;
    description: string;
    confirm: string;
    pending: string;
  }
> = {
  deactivate: {
    title: (name) => `Deactivate ${name}?`,
    description:
      "They are signed out everywhere and can't sign in until reactivated. Their leads stay assigned to them — transfer them first if someone else should follow up.",
    confirm: "Deactivate",
    pending: "Deactivating…",
  },
  "revoke-sessions": {
    title: (name) => `Sign ${name} out everywhere?`,
    description:
      "Every active session on every device ends now. They can sign in again with their password.",
    confirm: "Revoke sessions",
    pending: "Revoking…",
  },
};

/** One confirmation step for destructive user actions (row menu, context menu, drawer). */
export function ConfirmUserActionDialog() {
  const action = useUserUiStore((s) => s.confirmAction);
  const close = useUserUiStore((s) => s.closeConfirmAction);
  const deactivateUser = useDeactivateUser();
  const revokeSessions = useRevokeUserSessions();

  const copy = action ? COPY[action.kind] : null;
  const pending = deactivateUser.isPending || revokeSessions.isPending;
  const error =
    action?.kind === "deactivate" ? deactivateUser.error : revokeSessions.error;

  const handleClose = () => {
    deactivateUser.reset();
    revokeSessions.reset();
    close();
  };

  const confirm = async () => {
    if (!action) return;
    try {
      if (action.kind === "deactivate") {
        await deactivateUser.mutateAsync(action.userId);
      } else {
        await revokeSessions.mutateAsync(action.userId);
      }
      handleClose();
    } catch {
      // Shown inline below; keep the dialog open so the user can retry.
    }
  };

  return (
    <Dialog
      open={Boolean(action)}
      onOpenChange={(next) => !next && !pending && handleClose()}
    >
      <DialogContent className="sm:max-w-md">
        {action && copy ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.title(action.userName)}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error.message || "Something went wrong. Try again."}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void confirm()}
                disabled={pending}
              >
                {pending ? copy.pending : copy.confirm}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
