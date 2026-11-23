"use client";

import { useMemo, useState } from "react";
import { IconFolder, IconHome, IconLock } from "@tabler/icons-react";
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
  useBulkDeleteFiles,
  useCreateFolder,
  useDeleteFolder,
  useMoveFiles,
  useSetFolderPassword,
  useUnlockFolder,
  useUpdateFolder,
} from "@/features/files/mutations";
import type { FileFolder } from "@/features/files/types";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { buildChildrenMap } from "./folder-tree";

const MIN_FOLDER_PASSWORD = 6;

/** Runs a mutation; errors are already shown as toasts by useApiMutation. */
async function attempt(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return true;
  } catch {
    return false;
  }
}

/* ─── Create / rename ─────────────────────────────────────────────────────── */

export function FolderFormDialog({
  open,
  onOpenChange,
  parentId,
  folder,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where a new folder is created (create mode). */
  parentId: string | null;
  /** Folder being renamed (rename mode). */
  folder?: FileFolder;
  onCreated?: (folder: FileFolder) => void;
}) {
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const renaming = Boolean(folder);
  const [name, setName] = useState(folder?.name ?? "");
  const [makePrivate, setMakePrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const trimmed = name.trim();
  const passwordOk =
    !makePrivate || (password.length >= MIN_FOLDER_PASSWORD && password === confirm);
  const pending = createFolder.isPending || updateFolder.isPending;
  const canSubmit = trimmed.length > 0 && passwordOk && !pending;

  const close = () => {
    onOpenChange(false);
    setName(folder?.name ?? "");
    setMakePrivate(false);
    setPassword("");
    setConfirm("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (folder) {
      if (trimmed === folder.name) return close();
      if (
        await attempt(() =>
          updateFolder.mutateAsync({ folderId: folder.id, input: { name: trimmed } }),
        )
      )
        close();
      return;
    }
    let created: FileFolder | undefined;
    const ok = await attempt(async () => {
      created = await createFolder.mutateAsync({
        name: trimmed,
        ...(parentId ? { parentId } : {}),
        ...(makePrivate ? { password } : {}),
      });
    });
    if (ok) {
      close();
      if (created) onCreated?.(created);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{renaming ? "Rename folder" : "New folder"}</DialogTitle>
          {!renaming ? (
            <DialogDescription>
              Private folders ask for a password before anyone can open them.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
              required
            />
          </div>
          {!renaming ? (
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={makePrivate}
                  onCheckedChange={(checked) => setMakePrivate(checked === true)}
                />
                <IconLock className="size-4 text-muted-foreground" />
                Private folder (password-protected)
              </label>
              {makePrivate ? (
                <PasswordPair
                  password={password}
                  confirm={confirm}
                  onPassword={setPassword}
                  onConfirm={setConfirm}
                />
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? "Saving..." : renaming ? "Rename" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordPair({
  password,
  confirm,
  onPassword,
  onConfirm,
  label = "Password",
}: {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  label?: string;
}) {
  const tooShort = password.length > 0 && password.length < MIN_FOLDER_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="folder-password">{label}</Label>
        <Input
          id="folder-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          aria-invalid={tooShort}
        />
        <p className={cn("text-xs", tooShort ? "text-destructive" : "text-muted-foreground")}>
          At least {MIN_FOLDER_PASSWORD} characters. Share it only with people who
          should see this folder.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="folder-password-confirm">Confirm password</Label>
        <Input
          id="folder-password-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => onConfirm(event.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch ? (
          <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Privacy (set / change / remove / reset password) ───────────────────── */

export function FolderPrivacyDialog({
  folder,
  onOpenChange,
}: {
  folder: FileFolder | null;
  onOpenChange: (open: boolean) => void;
}) {
  const setFolderPassword = useSetFolderPassword();
  const { can } = usePermissions();
  const canReset = can("file.manage");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const close = () => {
    onOpenChange(false);
    setCurrent("");
    setPassword("");
    setConfirm("");
  };

  if (!folder) return null;
  const isPrivate = folder.isPrivate;
  const newOk = password.length >= MIN_FOLDER_PASSWORD && password === confirm;
  const currentOk = !isPrivate || current.length > 0 || canReset;

  const save = async (newPassword: string | null) => {
    const ok = await attempt(() =>
      setFolderPassword.mutateAsync({
        folderId: folder.id,
        input: {
          ...(current ? { currentPassword: current } : {}),
          newPassword,
        },
      }),
    );
    if (ok) close();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isPrivate ? "Folder password" : "Make folder private"}
          </DialogTitle>
          <DialogDescription>
            {isPrivate
              ? `"${folder.name}" and everything inside it need a password to open.`
              : `Anyone opening "${folder.name}" will need this password.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (newOk && currentOk) void save(password);
          }}
        >
          {isPrivate ? (
            <div className="space-y-1.5">
              <Label htmlFor="folder-current-password">Current password</Label>
              <Input
                id="folder-current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
              {canReset ? (
                <p className="text-xs text-muted-foreground">
                  Forgot it? Leave this empty: as a files manager you can reset
                  it. The reset is recorded in the audit log.
                </p>
              ) : null}
            </div>
          ) : null}
          <PasswordPair
            label={isPrivate ? "New password" : "Password"}
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
          />
          <DialogFooter className="gap-2 sm:justify-between">
            {isPrivate ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={!currentOk || setFolderPassword.isPending}
                onClick={() => void save(null)}
              >
                Remove password
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newOk || !currentOk || setFolderPassword.isPending}
              >
                {isPrivate ? "Change password" : "Make private"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Delete (empty folders only) ─────────────────────────────────────────── */

export function DeleteFolderDialog({
  folder,
  onOpenChange,
  onDeleted,
}: {
  folder: FileFolder | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (folder: FileFolder) => void;
}) {
  const deleteFolder = useDeleteFolder();
  if (!folder) return null;
  return (
    <Dialog open onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{folder.name}&rdquo;?</DialogTitle>
          <DialogDescription>
            Only empty folders can be deleted. Move or delete its files and
            subfolders first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteFolder.isPending}
            onClick={async () => {
              if (await attempt(() => deleteFolder.mutateAsync(folder.id))) {
                onOpenChange(false);
                onDeleted?.(folder);
              }
            }}
          >
            Delete folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Move files and folders ──────────────────────────────────────────────── */

export function MoveItemsDialog({
  fileIds,
  folderIds,
  folders,
  currentFolderId,
  onOpenChange,
  onMoved,
}: {
  fileIds: string[];
  folderIds: string[];
  folders: FileFolder[];
  currentFolderId: string | null;
  onOpenChange: (open: boolean) => void;
  onMoved?: () => void;
}) {
  const moveFiles = useMoveFiles();
  const updateFolder = useUpdateFolder();
  const [target, setTarget] = useState<string | null>(currentFolderId);
  const [pending, setPending] = useState(false);

  // A folder can't move into itself or anything below it.
  const blocked = useMemo(() => {
    const children = buildChildrenMap(folders);
    const out = new Set<string>();
    const walk = (id: string) => {
      out.add(id);
      for (const child of children.get(id) ?? []) walk(child.id);
    };
    folderIds.forEach(walk);
    return out;
  }, [folders, folderIds]);

  const rows = useMemo(() => {
    const children = buildChildrenMap(folders);
    const out: { folder: FileFolder; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const folder of children.get(parentId) ?? []) {
        out.push({ folder, depth });
        if (!folder.isLocked && !blocked.has(folder.id)) walk(folder.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [folders, blocked]);

  const count = fileIds.length + folderIds.length;
  const label = [
    fileIds.length ? `${fileIds.length} file${fileIds.length === 1 ? "" : "s"}` : null,
    folderIds.length
      ? `${folderIds.length} folder${folderIds.length === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const move = async () => {
    setPending(true);
    try {
      if (fileIds.length > 0) {
        await moveFiles.mutateAsync({ fileIds, folderId: target });
      }
      for (const folderId of folderIds) {
        await updateFolder.mutateAsync({ folderId, input: { parentId: target } });
      }
      onOpenChange(false);
      onMoved?.();
    } catch {
      // Each failing step already showed its toast.
    } finally {
      setPending(false);
    }
  };

  const option = (
    key: string,
    value: string | null,
    text: string,
    icon: React.ReactNode,
    depth: number,
    disabled = false,
  ) => (
    <li key={key}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setTarget(value)}
        aria-pressed={target === value}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm",
          target === value ? "bg-primary/10 text-foreground" : "hover:bg-muted/60",
          disabled && "cursor-not-allowed opacity-50",
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {icon}
        <span className="truncate">{text}</span>
      </button>
    </li>
  );

  return (
    <Dialog open onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move {label}</DialogTitle>
          <DialogDescription>
            Choose where {count === 1 ? "it" : "they"} should go.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-72 overflow-y-auto rounded-lg border border-border/60 p-1">
          {option("home", null, "Home", <IconHome className="size-4" />, 0)}
          {rows.map(({ folder, depth }) => {
            const disabled = folder.isLocked || blocked.has(folder.id);
            return option(
              folder.id,
              folder.id,
              folder.isLocked ? `${folder.name} (locked)` : folder.name,
              folder.isLocked ? (
                <IconLock className="size-4 text-amber-600" />
              ) : (
                <IconFolder className="size-4 text-muted-foreground" />
              ),
              depth + 1,
              disabled,
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={target === currentFolderId || pending} onClick={() => void move()}>
            {pending ? "Moving..." : "Move here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Delete selection ────────────────────────────────────────────────────── */

export function DeleteItemsDialog({
  fileIds,
  folders,
  onOpenChange,
  onDeleted,
}: {
  fileIds: string[];
  folders: FileFolder[];
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const bulkDelete = useBulkDeleteFiles();
  const deleteFolder = useDeleteFolder();
  const [pending, setPending] = useState(false);
  const count = fileIds.length + folders.length;

  const run = async () => {
    setPending(true);
    try {
      if (fileIds.length > 0) await bulkDelete.mutateAsync(fileIds);
      for (const folder of folders) await deleteFolder.mutateAsync(folder.id);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      // toast already shown; keep the dialog so the user sees what remains
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Delete {count} item{count === 1 ? "" : "s"}?
          </DialogTitle>
          <DialogDescription>
            {fileIds.length > 0
              ? "Deleted files can't be recovered from here. "
              : ""}
            {folders.length > 0
              ? "Folders are deleted only if they are empty."
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => void run()}>
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Locked folder screen ────────────────────────────────────────────────── */

export function LockedFolderScreen({
  folder,
  lockRootId,
}: {
  folder: FileFolder;
  /** The ancestor-or-self that actually holds the password. */
  lockRootId: string;
}) {
  const unlock = useUnlockFolder();
  const [password, setPassword] = useState("");
  const inherited = lockRootId !== folder.id;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form
        className="w-full max-w-xs space-y-4 text-center"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!password) return;
          await attempt(() =>
            unlock.mutateAsync({ folderId: lockRootId, password }),
          );
          setPassword("");
        }}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <IconLock className="size-7" stroke={1.5} />
        </div>
        <div>
          <h2 className="text-base font-semibold">
            &ldquo;{folder.name}&rdquo; is private
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {inherited
              ? "It is inside a password-protected folder. Enter that folder's password to open it."
              : "Enter the folder password to open it. It stays open for 30 minutes on this device."}
          </p>
        </div>
        <Input
          type="password"
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Folder password"
          aria-label="Folder password"
          autoFocus
        />
        <Button type="submit" className="w-full" disabled={!password || unlock.isPending}>
          {unlock.isPending ? "Unlocking..." : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
