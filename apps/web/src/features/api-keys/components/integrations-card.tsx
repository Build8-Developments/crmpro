"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { Skeleton } from "@/components/ui/skeleton";
import { createApiKey, getApiKeys, revokeApiKey } from "@/features/api-keys/api";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { ApiError } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/format";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function inboundEndpoint(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  const base = configured.startsWith("http")
    ? configured
    : `${typeof window !== "undefined" ? window.location.origin : ""}${configured}`;
  return `${base.replace(/\/$/, "")}/inbound/leads`;
}

export function IntegrationsCard() {
  const t = useTranslations("integrations");
  const keys = useQuery({
    queryKey: queryKeys.apiKeys.all(),
    queryFn: getApiKeys,
    retry: false,
  });
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const revoke = useApiMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    successMessage: t("revoked"),
    invalidateKeys: [queryKeys.apiKeys.all()],
  });
  const endpoint = inboundEndpoint();
  const planBlocked =
    keys.error instanceof ApiError && keys.error.status === 403;

  return (
    <SettingsSection
      title={t("title")}
      description={t("description")}
      action={
        planBlocked ? null : (
          <Button size="sm" className="h-8" onClick={() => setCreating(true)}>
            <AppIcons.create className="size-3.5" />
            {t("newKey")}
          </Button>
        )
      }
    >
      {planBlocked ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t("planRequired")}
        </p>
      ) : (
        <div className="space-y-4">
          {keys.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !keys.data?.items.length ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {keys.data.items.map((key) => (
                <li
                  key={key.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2.5",
                    key.revokedAt && "opacity-60",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{key.name}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {key.prefix}…
                      {" · "}
                      {key.revokedAt
                        ? t("revoked")
                        : key.lastUsedAt
                          ? t("lastUsed", { when: formatRelativeTime(key.lastUsedAt) })
                          : t("neverUsed")}
                    </span>
                  </span>
                  {!key.revokedAt ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive"
                      disabled={revoke.isPending}
                      onClick={() => {
                        if (window.confirm(t("revokeConfirm", { name: key.name }))) {
                          void revoke.mutateAsync(key.id);
                        }
                      }}
                    >
                      {t("revoke")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
            <p className="font-medium">{t("endpoint")}</p>
            <code className="block break-all rounded bg-background px-2 py-1 font-mono">
              POST {endpoint}
            </code>
            <p className="pt-1 font-medium">{t("example")}</p>
            <pre dir="ltr" className="overflow-x-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed">{`curl -X POST "${endpoint}" \\
  -H "X-Api-Key: crm_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"fullName":"Ahmed Ali","phone":"01001234567",
       "source":"Facebook Ads","project":"Palm Hills New Cairo",
       "campaign":"November launch","externalId":"fb-123"}'`}</pre>
            <p className="text-muted-foreground">{t("duplicateRule")}</p>
          </div>
        </div>
      )}

      <CreateKeyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(raw) => {
          setCreating(false);
          setRevealedKey(raw);
        }}
      />
      <RevealKeyDialog rawKey={revealedKey} onClose={() => setRevealedKey(null)} />
    </SettingsSection>
  );
}

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (rawKey: string) => void;
}) {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const create = useApiMutation({
    mutationFn: (keyName: string) => createApiKey(keyName),
    invalidateKeys: [queryKeys.apiKeys.all()],
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newKey")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const created = await create.mutateAsync(name.trim());
              setName("");
              onCreated(created.apiKey);
            } catch {
              // toast shown
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="api-key-name">{t("keyName")}</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("keyNamePlaceholder")}
              minLength={2}
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={name.trim().length < 2 || create.isPending}>
              {create.isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevealKeyDialog({ rawKey, onClose }: { rawKey: string | null; onClose: () => void }) {
  const t = useTranslations("integrations");

  return (
    <Dialog open={rawKey !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newKey")}</DialogTitle>
          <DialogDescription>{t("copyOnce")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code dir="ltr" className="min-w-0 flex-1 break-all rounded border bg-muted/30 px-2 py-1.5 font-mono text-xs">
            {rawKey}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(rawKey ?? "");
                toast.success(t("copied"));
              } catch {
                toast.error("Copy failed");
              }
            }}
          >
            <AppIcons.copy className="size-3.5" />
            {t("copy")}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
