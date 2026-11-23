"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Row } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DealStatusBadge } from "@/features/deals/components/deal-status-badge";
import { DealsTotals } from "@/features/deals/components/deals-totals";
import { useDeals } from "@/features/deals/hooks";
import { dealColumns } from "@/features/deals/table/columns";
import type { Deal, DealSortField, DealStatus, DealsListParams } from "@/features/deals/types";
import {
  DEAL_STATUS_LABELS,
  formatDealDate,
  formatMonthKey,
  monthStart,
  toMonthKey,
} from "@/features/deals/utils/deal-format";
import { AssignLeadDialog } from "@/features/leads/components/assign-lead-dialog";
import { EditLeadDialog } from "@/features/leads/components/edit-lead-dialog";
import { LeadDetailDrawer } from "@/features/leads/components/lead-detail-drawer";
import { LogInteractionDialog } from "@/features/leads/components/log-interaction-dialog";
import { MoveStageDialog } from "@/features/leads/components/move-stage-dialog";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEALS_PAGE_SIZE = 50;
const DEAL_STATUSES = ["RESERVED", "CONTRACTED", "CANCELLED"] as const;
const PERIOD_FIELDS = ["any", "reservedAt", "contractedAt", "cancelledAt"] as const;

/** A date window from a link (e.g. the dashboard): `from`/`to` ISO, `to` exclusive. */
interface LinkedRange {
  from: string;
  to: string;
  periodField: NonNullable<DealsListParams["periodField"]>;
}

function readLinkedRange(params: URLSearchParams): LinkedRange | null {
  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return null;
  }
  const field = params.get("periodField");
  const periodField = PERIOD_FIELDS.find((value) => value === field) ?? "any";
  return { from, to, periodField };
}

const PERIOD_FIELD_LABELS: Record<LinkedRange["periodField"], string> = {
  any: "Dated",
  reservedAt: "Reserved",
  contractedAt: "Contracted",
  cancelledAt: "Cancelled",
};

function linkedRangeLabel(range: LinkedRange): string {
  const what = PERIOD_FIELD_LABELS[range.periodField];
  // `to` is exclusive: show the last included day.
  const last = new Date(Date.parse(range.to) - 1).toISOString();
  return `${what} ${formatDealDate(range.from)} – ${formatDealDate(last)}`;
}
const MONTHS_BACK = 12;
const ALL = "all";
/** Status filter value for "reserved or contracted" (`live=true`). */
const LIVE = "live";

/**
 * Deals on won leads: totals per status for the filtered set, a sortable
 * table (cards on phones). A row opens its lead.
 */
export function DealsPage() {
  const now = useNow(60 * 60 * 1000);
  const { can } = usePermissions();
  const { users, projects } = useLeadFilterOptions();
  const openDrawer = useLeadUiStore((s) => s.openDrawer);

  // Filters can arrive in the URL (dashboard links); after that they are local.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<DealSortField>("reservedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState<DealStatus | typeof ALL | typeof LIVE>(
    () =>
      DEAL_STATUSES.find((value) => value === searchParams.get("status")) ??
      (searchParams.get("live") === "true" ? LIVE : ALL),
  );
  const [agentId, setAgentId] = useState<string>(() => searchParams.get("agentId") ?? ALL);
  const [projectId, setProjectId] = useState<string>(
    () => searchParams.get("projectId") ?? ALL,
  );
  const [month, setMonth] = useState<string>(ALL);
  const [linkedRange, setLinkedRange] = useState<LinkedRange | null>(() =>
    readLinkedRange(searchParams),
  );
  const debouncedSearch = useDebouncedValue(search, 400);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: MONTHS_BACK }, (_, index) => toMonthKey(monthStart(now, -index))),
    [now],
  );

  const params = useMemo<DealsListParams>(() => {
    let from: string | undefined;
    let to: string | undefined;
    let periodField: DealsListParams["periodField"];
    if (linkedRange) {
      ({ from, to, periodField } = linkedRange);
    } else if (month !== ALL) {
      const [year, monthIndex] = month.split("-").map(Number);
      from = new Date(year, monthIndex - 1, 1).toISOString();
      to = new Date(year, monthIndex, 1).toISOString();
    }
    return {
      page,
      limit: DEALS_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      sortBy,
      sortOrder,
      status: status === ALL || status === LIVE ? undefined : status,
      live: status === LIVE ? true : undefined,
      agentId: agentId === ALL ? undefined : agentId,
      projectId: projectId === ALL ? undefined : projectId,
      from,
      to,
      periodField,
    };
  }, [page, debouncedSearch, sortBy, sortOrder, status, agentId, projectId, month, linkedRange]);

  const { data, isLoading, isError, isFetching, refetch } = useDeals(params);
  const deals = data?.items ?? [];
  const currency = deals[0]?.currency ?? "EGP";
  const table = useDataTable({ data: deals, columns: dealColumns });

  const hasFilters =
    debouncedSearch.trim().length > 0 ||
    status !== ALL ||
    agentId !== ALL ||
    projectId !== ALL ||
    month !== ALL ||
    linkedRange !== null;

  // Every filter change starts again from page 1.
  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const clearFilters = () => {
    setSearch("");
    setStatus(ALL);
    setAgentId(ALL);
    setProjectId(ALL);
    setMonth(ALL);
    setLinkedRange(null);
    setPage(1);
  };

  const canFilterAgents = can("lead.assign") && (users.data?.length ?? 0) > 0;

  return (
    <div className="space-y-4 px-4 py-5 md:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Deals</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Reservations and contracts on won leads
          {linkedRange
            ? ` · ${linkedRangeLabel(linkedRange)}`
            : month !== ALL
              ? ` · ${formatMonthKey(month)}`
              : ""}
        </p>
      </div>

      <DealsTotals totals={data?.totals} currency={currency} isLoading={isLoading} />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => withPageReset(setSearch)(event.target.value)}
              placeholder="Search by lead name…"
              className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
              aria-label="Search deals"
            />
          </div>

          {linkedRange ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => withPageReset(setLinkedRange)(null)}
              aria-label={`Remove filter: ${linkedRangeLabel(linkedRange)}`}
            >
              {linkedRangeLabel(linkedRange)}
              <AppIcons.close className="size-3.5" />
            </Button>
          ) : null}

          <Select
            value={month}
            onValueChange={(value) => {
              // A picked month replaces a range that came from a link.
              setLinkedRange(null);
              withPageReset(setMonth)(value);
            }}
          >
            <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All time</SelectItem>
              {monthOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {formatMonthKey(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) =>
              withPageReset(setStatus)(value as DealStatus | typeof ALL | typeof LIVE)
            }
          >
            <SelectTrigger className="h-8 w-[8.5rem] text-xs" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value={LIVE}>Not cancelled</SelectItem>
              {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {DEAL_STATUS_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canFilterAgents ? (
            <Select value={agentId} onValueChange={withPageReset(setAgentId)}>
              <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Agent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All agents</SelectItem>
                {(users.data ?? []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {(projects.data?.length ?? 0) > 0 ? (
            <Select value={projectId} onValueChange={withPageReset(setProjectId)}>
              <SelectTrigger className="h-8 w-[10rem] text-xs" aria-label="Project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All projects</SelectItem>
                {(projects.data ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={clearFilters}
            >
              <AppIcons.close className="size-3.5" />
              Clear
            </Button>
          ) : null}

          <span
            className={cn(
              "ml-auto text-xs tabular-nums text-muted-foreground",
              isFetching && "opacity-70",
            )}
          >
            {formatNumber(data?.pagination.totalItems ?? 0)} deals
          </span>
        </div>

        {isError ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <AppIcons.alertCircle className="size-5 text-destructive" />
            <h2 className="mt-3 text-sm font-medium">Failed to load deals</h2>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        ) : (
          <>
            <DataTable
              table={table}
              minWidth={860}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(nextSortBy, nextSortOrder) => {
                setSortBy(nextSortBy as DealSortField);
                setSortOrder(nextSortOrder);
                setPage(1);
              }}
              onRowClick={(deal) => openDrawer(deal.leadId)}
              rowClassName={(deal) => deal.status === "CANCELLED" && "opacity-60"}
              renderCard={(row) => (
                <DealCard row={row} onOpen={() => openDrawer(row.original.leadId)} />
              )}
              isLoading={isLoading}
              emptyState={<DealsEmptyState hasFilters={hasFilters} />}
              aria-label="Deals"
            />
            {data?.pagination ? (
              <DataTablePagination
                pagination={data.pagination}
                onPageChange={setPage}
                itemLabel="deals"
                hideOnSinglePage
              />
            ) : null}
          </>
        )}
      </div>

      <LeadDetailDrawer />
      <EditLeadDialog />
      <AssignLeadDialog />
      <MoveStageDialog />
      <LogInteractionDialog />
    </div>
  );
}

function DealCard({ row, onOpen }: { row: Row<Deal>; onOpen: () => void }) {
  const deal = row.original;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col gap-1 px-4 py-3 text-start",
        deal.status === "CANCELLED" && "opacity-60",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{deal.lead.fullName}</span>
        <DealStatusBadge status={deal.status} />
      </span>
      <span className="text-base font-semibold tabular-nums">
        {formatMoney(deal.price, deal.currency)}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {[deal.unitType, deal.unitCode, deal.project?.name].filter(Boolean).join(" · ")}
      </span>
      <span className="flex justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{deal.agent?.name ?? "—"}</span>
        <span className="shrink-0 tabular-nums">
          {deal.contractedAt
            ? `Contracted ${formatDealDate(deal.contractedAt)}`
            : `Reserved ${formatDealDate(deal.reservedAt)}`}
        </span>
      </span>
    </button>
  );
}

function DealsEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <AppIcons.deals className="size-5" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-foreground">
        {hasFilters ? "No deals match" : "No deals yet"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try another month, status or agent."
          : "A deal is recorded when a lead is moved to a Won stage."}
      </p>
    </div>
  );
}
