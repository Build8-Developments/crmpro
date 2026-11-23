"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/features/api-keys/components/copy-button";
import { CreateApiKeyDialog } from "@/features/api-keys/components/create-api-key-dialog";
import { RevokeApiKeyDialog } from "@/features/api-keys/components/revoke-api-key-dialog";
import { useApiKeys } from "@/features/api-keys/hooks";
import type { ApiKey } from "@/features/api-keys/types";
import { useClientValue } from "@/hooks/use-client-value";
import { ApiError } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const INBOUND_PATH = "/api/v1/inbound/leads";
const DOCS_PATH = "docs/api/inbound-leads.md";

/**
 * Settings → Leads & sales → Integrations. API keys let website forms,
 * Zapier/Make and ad platforms push leads in; new leads arrive unassigned.
 */
export function IntegrationsPage() {
  const { data: keys, isLoading, error } = useApiKeys();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const endpoint = useClientValue(() => `${window.location.origin}${INBOUND_PATH}`, INBOUND_PATH);

  const planBlocked = error instanceof ApiError && error.status === 403;
  const activeCount = (keys ?? []).filter((key) => !key.revokedAt).length;

  return (
    <div className="space-y-5 px-4 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Integrations</h1>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Send leads into Nomow from your website forms, Zapier, Make or ad platforms with an API
            key. New leads land unassigned in your default pipeline, so a manager can distribute them.
            If the phone already belongs to an open lead, that lead&apos;s owner is told the client came
            back instead of creating a duplicate.
          </p>
        </div>
        {planBlocked ? null : (
          <Button size="sm" onClick={() => setCreating(true)} disabled={isLoading}>
            <AppIcons.create className="size-4" />
            New API key
          </Button>
        )}
      </div>

      {planBlocked ? (
        <div className="flex max-w-3xl flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <AppIcons.lock className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium">API access isn&apos;t included in your plan</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Upgrade your plan to connect website forms and lead ads directly. Until then you can
            import leads from a CSV file.
          </p>
        </div>
      ) : (
        <>
          <section className="max-w-3xl overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
            <div className="flex items-baseline justify-between border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold">API keys</h2>
              {keys ? (
                <span className="text-xs text-muted-foreground tabular-nums">{activeCount} active</span>
              ) : null}
            </div>
            {isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Couldn&apos;t load your API keys. Refresh the page to try again.
              </p>
            ) : (keys ?? []).length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium">No API keys yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create one for each tool that will send you leads.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {(keys ?? []).map((key) => (
                  <ApiKeyRow key={key.id} apiKey={key} onRevoke={() => setRevoking(key)} />
                ))}
              </ul>
            )}
          </section>

          <HowToSendLeads endpoint={endpoint} />
        </>
      )}

      <CreateApiKeyDialog open={creating} onClose={() => setCreating(false)} />
      <RevokeApiKeyDialog apiKey={revoking} onClose={() => setRevoking(null)} />
    </div>
  );
}

function ApiKeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: () => void }) {
  const revoked = Boolean(apiKey.revokedAt);

  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", revoked && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{apiKey.name}</p>
          <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {apiKey.prefix}…
          </code>
          {revoked ? <Badge variant="secondary">Revoked</Badge> : null}
          {apiKey.source ? <Badge variant="outline">{apiKey.source.name}</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {revoked && apiKey.revokedAt
            ? `Revoked ${formatRelativeTime(apiKey.revokedAt)}`
            : apiKey.lastUsedAt
              ? `Last used ${formatRelativeTime(apiKey.lastUsedAt)}`
              : "Never used"}
          {" · "}
          Created {formatRelativeTime(apiKey.createdAt)}
          {apiKey.createdBy ? ` by ${apiKey.createdBy.name}` : null}
        </p>
      </div>
      {revoked ? null : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={onRevoke}
        >
          Revoke
        </Button>
      )}
    </li>
  );
}

function HowToSendLeads({ endpoint }: { endpoint: string }) {
  const curl = `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer crm_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fullName": "Ahmed Ali",
    "phone": "01001234567",
    "email": "ahmed@example.com",
    "message": "Interested in a 3-bedroom apartment",
    "projectName": "Palm Hills New Cairo",
    "externalId": "meta-lead-123456",
    "utmSource": "facebook",
    "utmCampaign": "november-launch"
  }'`;

  return (
    <section className="max-w-3xl space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-sm font-semibold">How to send leads</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Send a JSON <span className="font-mono">POST</span> from your server, Zapier or Make. Keep
          the key secret: don&apos;t put it in browser code on your website.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="min-w-0 flex-1 rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs break-all"
        >
          POST {endpoint}
        </code>
        <CopyButton value={endpoint} label="Copy URL" className="shrink-0" />
      </div>

      <div className="relative">
        <pre
          dir="ltr"
          className="overflow-x-auto rounded-md border bg-muted/40 p-3 pr-24 font-mono text-[11px] leading-relaxed"
        >
          {curl}
        </pre>
        <CopyButton value={curl} className="absolute top-2 right-2 h-7" />
      </div>

      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">fullName</span> and{" "}
          <span className="font-medium text-foreground">phone</span> are required; everything else is
          optional.
        </li>
        <li>
          Send <span className="font-mono">externalId</span> (e.g. the Meta lead id) so retries never
          create a second lead.
        </li>
        <li>
          Responses: <span className="font-mono">201 created</span>,{" "}
          <span className="font-mono">200 resubmitted</span> (client came back),{" "}
          <span className="font-mono">200 duplicate_request</span> (already received). Each key can send
          60 requests a minute.
        </li>
      </ul>

      <p className="text-xs text-muted-foreground">
        Full reference, including a Zapier/Make recipe for Meta Lead Ads:{" "}
        <code className="font-mono text-foreground">{DOCS_PATH}</code>
      </p>
    </section>
  );
}
