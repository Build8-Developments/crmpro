import {
  CONTACT_CHANNEL_PREFERENCES,
  PAYMENT_PREFERENCES,
  PURCHASE_PURPOSES,
} from "@crmpro/shared";
import type {
  LeadsLayout,
  LeadsSortField,
  LeadsTableFilters,
} from "@/features/leads/stores/leads-table-store";
import {
  HEAT_OPTIONS,
  INTEREST_LEVEL_OPTIONS,
  LAST_CONTACT_OPTIONS,
  LEAD_STATUS_OPTIONS,
  NEXT_STEP_OPTIONS,
} from "@/features/leads/utils/lead-filters";

/**
 * The leads list state that lives in the URL (`/leads?…`), so a list can be
 * shared, bookmarked and restored with Back. Pure: no React, no store.
 *
 * Param names are the API's (GetLeadsQueryDto) except `unassigned`, which is
 * what dashboard and notification links already use. Defaults are left out,
 * so a clean list has a clean URL. `id` (open lead) is not part of the state.
 */
export interface LeadsUrlState {
  filters: LeadsTableFilters;
  search: string;
  sortBy: LeadsSortField;
  sortOrder: "asc" | "desc";
  layout: LeadsLayout;
}

export const LEADS_SORT_FIELDS: readonly LeadsSortField[] = [
  "createdAt",
  "updatedAt",
  "fullName",
  "lastContactedAt",
  "nextTaskDueAt",
];

export const DEFAULT_LEADS_URL_STATE: LeadsUrlState = {
  filters: {},
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  layout: "list",
};

type Params = Pick<URLSearchParams, "get" | "has">;

type FieldCodec =
  | { kind: "text"; key: keyof LeadsTableFilters; param: string }
  | { kind: "flag"; key: keyof LeadsTableFilters; param: string; aliases?: string[] }
  | { kind: "enum"; key: keyof LeadsTableFilters; param: string; values: readonly string[] }
  | { kind: "list"; key: keyof LeadsTableFilters; param: string; values?: readonly string[] }
  | { kind: "number"; key: keyof LeadsTableFilters; param: string; integer?: boolean; min: number; max?: number }
  | { kind: "date"; key: keyof LeadsTableFilters; param: string };

const values = (options: ReadonlyArray<{ value: string }>) => options.map((option) => option.value);

/** Serialization order = order in the URL. */
const FIELDS: readonly FieldCodec[] = [
  { kind: "text", key: "pipelineId", param: "pipelineId" },
  { kind: "text", key: "stageId", param: "stageId" },
  { kind: "list", key: "stageIds", param: "stageIds" },
  { kind: "text", key: "sourceId", param: "sourceId" },
  { kind: "list", key: "sourceIds", param: "sourceIds" },
  { kind: "list", key: "assignees", param: "assignees" },
  { kind: "enum", key: "status", param: "status", values: values(LEAD_STATUS_OPTIONS) },
  { kind: "text", key: "projectId", param: "projectId" },
  { kind: "enum", key: "interestLevel", param: "interestLevel", values: values(INTEREST_LEVEL_OPTIONS) },
  { kind: "list", key: "heat", param: "heat", values: values(HEAT_OPTIONS) },
  { kind: "enum", key: "lastContact", param: "lastContact", values: values(LAST_CONTACT_OPTIONS) },
  { kind: "enum", key: "nextStep", param: "nextStep", values: values(NEXT_STEP_OPTIONS) },
  { kind: "enum", key: "slaBreached", param: "slaBreached", values: ["today"] },
  { kind: "flag", key: "unassignedOnly", param: "unassigned", aliases: ["unassignedOnly"] },
  { kind: "flag", key: "assignedOnly", param: "assignedOnly" },
  { kind: "flag", key: "openOnly", param: "openOnly" },
  { kind: "flag", key: "staleOnly", param: "staleOnly", aliases: ["stale"] },
  { kind: "flag", key: "stageStale", param: "stageStale" },
  { kind: "flag", key: "stuck", param: "stuck" },
  { kind: "number", key: "unansweredMin", param: "unansweredMin", integer: true, min: 1, max: 50 },
  { kind: "text", key: "lostReasonId", param: "lostReasonId" },
  { kind: "date", key: "createdFrom", param: "createdFrom" },
  { kind: "date", key: "createdTo", param: "createdTo" },
  { kind: "date", key: "closedFrom", param: "closedFrom" },
  { kind: "date", key: "closedTo", param: "closedTo" },
  { kind: "number", key: "budgetMin", param: "budgetMin", min: 0 },
  { kind: "number", key: "budgetMax", param: "budgetMax", min: 0 },
  { kind: "list", key: "paymentPreferences", param: "paymentPreferences", values: PAYMENT_PREFERENCES },
  {
    kind: "list",
    key: "contactChannelPreferences",
    param: "contactChannelPreferences",
    values: CONTACT_CHANNEL_PREFERENCES,
  },
  { kind: "list", key: "purchasePurposes", param: "purchasePurposes", values: PURCHASE_PURPOSES },
  { kind: "text", key: "residenceArea", param: "residenceArea" },
  { kind: "text", key: "occupation", param: "occupation" },
];

/** Old link params, read but never written (assignedUserId → assignees). */
const LEGACY_PARAMS = ["assignedUserId"];

const SEARCH_PARAM = "search";
const SORT_BY_PARAM = "sortBy";
const SORT_ORDER_PARAM = "sortOrder";
const LAYOUT_PARAM = "view";

/** Params that carry list filters (layout and the open-lead `id` excluded). */
const FILTER_PARAMS: readonly string[] = [
  ...FIELDS.flatMap((field) => [field.param, ...(field.kind === "flag" ? (field.aliases ?? []) : [])]),
  ...LEGACY_PARAMS,
  SEARCH_PARAM,
  SORT_BY_PARAM,
  SORT_ORDER_PARAM,
];

/** Every param this module owns; anything else in the URL is left alone. */
const OWNED_PARAMS: readonly string[] = [...FILTER_PARAMS, LAYOUT_PARAM];

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `yyyy-mm-dd` (a picked day) or a full ISO timestamp (from a dashboard link). */
export function isLeadDateFilterValue(value: string): boolean {
  if (DAY_PATTERN.test(value)) return !Number.isNaN(Date.parse(`${value}T00:00:00`));
  return value.includes("T") && !Number.isNaN(Date.parse(value));
}

function splitList(raw: string | null): string[] {
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function readField(params: Params, field: FieldCodec): unknown {
  const raw = params.get(field.param);
  switch (field.kind) {
    case "text": {
      const value = raw?.trim();
      return value ? value : undefined;
    }
    case "flag":
      return [field.param, ...(field.aliases ?? [])].some((name) => params.get(name) === "true")
        ? true
        : undefined;
    case "enum":
      return raw && field.values.includes(raw) ? raw : undefined;
    case "list": {
      const allowed = field.values;
      const items = [...new Set(splitList(raw))].filter((item) => !allowed || allowed.includes(item));
      return items.length > 0 ? items : undefined;
    }
    case "number": {
      if (raw === null || raw.trim() === "") return undefined;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < field.min) return undefined;
      if (field.max !== undefined && value > field.max) return undefined;
      if (field.integer && !Number.isInteger(value)) return undefined;
      return value;
    }
    case "date":
      return raw && isLeadDateFilterValue(raw) ? raw : undefined;
  }
}

function writeField(params: URLSearchParams, field: FieldCodec, value: unknown): void {
  switch (field.kind) {
    case "text":
    case "enum":
    case "date": {
      const text = typeof value === "string" ? value.trim() : "";
      if (text) params.set(field.param, text);
      return;
    }
    case "flag":
      if (value === true) params.set(field.param, "true");
      return;
    case "list":
      if (Array.isArray(value) && value.length > 0) params.set(field.param, value.join(","));
      return;
    case "number":
      if (typeof value === "number" && Number.isFinite(value)) params.set(field.param, String(value));
      return;
  }
}

/** True when the URL carries any list filter, search or sort. */
export function hasLeadsFilterParams(params: Params): boolean {
  return FILTER_PARAMS.some((name) => params.has(name));
}

/** URL → state. Unknown or invalid values are ignored (fall back to defaults). */
export function parseLeadsUrlState(params: Params): LeadsUrlState {
  const filters: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = readField(params, field);
    if (value !== undefined) filters[field.key] = value;
  }
  const legacyAssignee = params.get("assignedUserId")?.trim();
  if (legacyAssignee && !filters.assignees) filters.assignees = [legacyAssignee];

  const sortBy = LEADS_SORT_FIELDS.find((field) => field === params.get(SORT_BY_PARAM));
  const sortOrder = params.get(SORT_ORDER_PARAM);

  return {
    filters: filters as LeadsTableFilters,
    search: params.get(SEARCH_PARAM)?.trim() ?? "",
    sortBy: sortBy ?? DEFAULT_LEADS_URL_STATE.sortBy,
    sortOrder:
      sortOrder === "asc" || sortOrder === "desc" ? sortOrder : DEFAULT_LEADS_URL_STATE.sortOrder,
    layout: params.get(LAYOUT_PARAM) === "board" ? "board" : "list",
  };
}

/** State → URL params, defaults omitted. */
export function serializeLeadsUrlState(state: LeadsUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const filters = state.filters as Record<string, unknown>;
  for (const field of FIELDS) {
    // A single-owner filter (older saved views) is written as `assignees`.
    const value =
      field.key === "assignees" && !state.filters.assignees?.length && state.filters.assignedUserId
        ? [state.filters.assignedUserId]
        : filters[field.key];
    writeField(params, field, value);
  }
  const search = state.search.trim();
  if (search) params.set(SEARCH_PARAM, search);
  if (state.sortBy !== DEFAULT_LEADS_URL_STATE.sortBy || state.sortOrder !== DEFAULT_LEADS_URL_STATE.sortOrder) {
    params.set(SORT_BY_PARAM, state.sortBy);
    params.set(SORT_ORDER_PARAM, state.sortOrder);
  }
  if (state.layout === "board") params.set(LAYOUT_PARAM, "board");
  return params;
}

/** Commas stay readable in the address bar (`heat=HOT,WARM`). */
function toQueryString(params: URLSearchParams): string {
  return params.toString().replace(/%2C/gi, ",");
}

/** Comparable identity of a state: equal keys = same list. */
export function leadsUrlStateKey(state: LeadsUrlState): string {
  return toQueryString(serializeLeadsUrlState(state));
}

/**
 * The query string (no `?`) for `state`, keeping params this module does not
 * own (`id` for the open lead, anything else) in front.
 */
export function buildLeadsQueryString(current: Params & Iterable<[string, string]>, state: LeadsUrlState): string {
  const next = new URLSearchParams();
  for (const [name, value] of current) {
    if (!OWNED_PARAMS.includes(name)) next.append(name, value);
  }
  for (const [name, value] of serializeLeadsUrlState(state)) next.append(name, value);
  return toQueryString(next);
}

/** Same params, ignoring encoding differences (`%2C` vs `,`). */
export function sameQueryString(a: string, b: string): boolean {
  return new URLSearchParams(a).toString() === new URLSearchParams(b).toString();
}
