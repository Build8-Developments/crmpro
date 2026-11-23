"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/features/api-keys/components/copy-button";
import { useCreateApiKey } from "@/features/api-keys/hooks";
import type { CreatedApiKey } from "@/features/api-keys/types";
import { useLeadSources } from "@/features/lead-sources/hooks";

const NO_SOURCE = "none";

/**
 * Two steps in one dialog: name the key (and optionally pin its lead source),
 * then show the raw key exactly once.
 */
export function CreateApiKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [created, setCreated] = useState<CreatedApiKey | null>(null);

  const close = () => {
    setCreated(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The key can't be shown again: only the explicit button closes that step.
        if (!next && !created) close();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!created}>
        {created ? (
          <RevealKey created={created} onDone={close} />
        ) : open ? (
          <CreateKeyForm onCreated={setCreated} onCancel={close} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateKeyForm({
  onCreated,
  onCancel,
}: {
  onCreated: (created: CreatedApiKey) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState(NO_SOURCE);
  const { data: sourcesPage } = useLeadSources();
  const sources = sourcesPage?.items ?? [];
  const create = useCreateApiKey();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    try {
      const result = await create.mutateAsync({
        name: name.trim(),
        ...(sourceId === NO_SOURCE ? {} : { sourceId }),
      });
      onCreated(result);
    } catch {
      // toast handled by useApiMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>New API key</DialogTitle>
        <DialogDescription>
          Use one key per integration (website form, Zapier, Make…) so you can revoke one without
          breaking the others.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="api-key-name">Name</Label>
        <Input
          id="api-key-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Zapier – Meta Lead Ads"
          maxLength={80}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="api-key-source">Lead source</Label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger id="api-key-source" className="w-full">
            <SelectValue placeholder="Taken from each request" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SOURCE}>Taken from each request</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Every lead sent with this key gets this source, whatever the request says.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending || name.trim().length < 2}>
          {create.isPending ? "Creating…" : "Create key"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RevealKey({ created, onDone }: { created: CreatedApiKey; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Copy your new key</DialogTitle>
        <DialogDescription>
          {created.name}
          {created.source ? ` · leads get the source “${created.source.name}”` : null}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        <AppIcons.alertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          This is the only time the key is shown. Store it somewhere safe, like your integration&apos;s
          settings. If you lose it, revoke it and create a new one.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="min-w-0 flex-1 rounded-md border bg-muted/40 px-2.5 py-2 font-mono text-xs break-all select-all"
        >
          {created.apiKey}
        </code>
        <CopyButton value={created.apiKey} className="shrink-0" />
      </div>

      <DialogFooter>
        <Button type="button" onClick={onDone}>
          I&apos;ve copied it
        </Button>
      </DialogFooter>
    </div>
  );
}
