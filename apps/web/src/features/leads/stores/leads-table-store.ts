import type { RowSelectionState } from "@tanstack/react-table";
import { create } from "zustand";
import type {
  ContactChannelPreference,
  PaymentPreference,
  PurchasePurpose,
  InterestLevel,
  LeadHeat,
  LeadLastContactFilter,
  LeadNextStepFilter,
  LeadSelectionFilters,
  LeadSlaBreachedFilter,
  LeadStatus,
  LeadsListParams,
} from "@/features/leads/types";
import { countActiveLeadFilters } from "@/features/leads/utils/lead-filters";
import type { LeadsUrlState } from "@/features/leads/utils/leads-url-state";

export interface LeadsTableFilters {
  id?: string;
  pipelineId?: string;
  stageId?: string;
  sourceId?: string;
  assignedUserId?: string;
  status?: LeadStatus;
  projectId?: string;
  unassignedOnly?: boolean;
  staleOnly?: boolean;
  openOnly?: boolean;
  /** Owner ids and/or "unassigned". */
  assignees?: string[];
  stageIds?: string[];
  sourceIds?: string[];
  heat?: LeadHeat[];
  interestLevel?: Exclude<InterestLevel, null>;
  /**
   * Inclusive. `yyyy-mm-dd` (a picked local day) or an ISO timestamp (an
   * exact bound from a dashboard link).
   */
  createdFrom?: string;
  createdTo?: string;
  /** Won or lost between these; same formats as createdFrom/createdTo. */
  closedFrom?: string;
  closedTo?: string;
  lastContact?: LeadLastContactFilter;
  nextStep?: LeadNextStepFilter;
  /** Dashboard "needs attention" filters (see apps/api leads/utils/lead-filter-where.util.ts). */
  slaBreached?: LeadSlaBreachedFilter;
  /** Open and longer in the stage than its stuck days. */
  stuck?: boolean;
  /** Open and not contacted for the stage's stale days. */
  stageStale?: boolean;
  /** Has an owner. */
  assignedOnly?: boolean;
  unansweredMin?: number;
  lostReasonId?: string;
  budgetMin?: number;
  budgetMax?: number;
  paymentPreferences?: PaymentPreference[];
  contactChannelPreferences?: ContactChannelPreference[];
  purchasePurposes?: PurchasePurpose[];
  residenceArea?: string;
  occupation?: string;
}

export type LeadsSortField =
  | "createdAt"
  | "updatedAt"
  | "fullName"
  | "lastContactedAt"
  | "nextTaskDueAt";

export type LeadsLayout = "list" | "board";

interface LeadsTableState {
  /** Table or kanban board (same filters either way). */
  layout: LeadsLayout;
  setLayout: (layout: LeadsLayout) => void;
  /** Applies a saved view: replaces filters and sort in one step (search cleared). */
  applyView: (view: {
    filters: LeadsTableFilters;
    sortBy?: LeadsSortField;
    sortOrder?: "asc" | "desc";
    layout?: LeadsLayout;
  }) => void;
  /** Applies the state read from the URL (arrival, Back/Forward, a link). */
  applyUrlState: (state: LeadsUrlState) => void;
  /** Search box text (the list query uses it debounced). */
  search: string;
  setSearch: (search: string) => void;
  page: number;
  limit: number;
  sortBy: LeadsSortField;
  sortOrder: "asc" | "desc";
  filters: LeadsTableFilters;
  rowSelection: RowSelectionState;
  /** Bulk actions target every lead matching the filters, not just the page. */
  selectAllMatching: boolean;
  setSelectAllMatching: (value: boolean) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sortBy: LeadsSortField, sortOrder: "asc" | "desc") => void;
  setFilters: (filters: Partial<LeadsTableFilters>) => void;
  clearFilters: () => void;
  setRowSelection: (selection: RowSelectionState) => void;
  clearRowSelection: () => void;
  resetPage: () => void;
}

const DEFAULT_LIMIT = 25;

export const useLeadsTableStore = create<LeadsTableState>((set) => ({
  layout: "list",
  setLayout: (layout) => set({ layout, rowSelection: {}, selectAllMatching: false }),
  applyView: (view) =>
    set((state) => ({
      filters: view.filters,
      sortBy: view.sortBy ?? "createdAt",
      sortOrder: view.sortOrder ?? "desc",
      layout: view.layout ?? state.layout,
      search: "",
      page: 1,
      rowSelection: {},
      selectAllMatching: false,
    })),
  applyUrlState: (urlState) =>
    set({
      filters: urlState.filters,
      search: urlState.search,
      sortBy: urlState.sortBy,
      sortOrder: urlState.sortOrder,
      layout: urlState.layout,
      page: 1,
      rowSelection: {},
      selectAllMatching: false,
    }),
  search: "",
  setSearch: (search) => set({ search }),
  page: 1,
  limit: DEFAULT_LIMIT,
  sortBy: "createdAt",
  sortOrder: "desc",
  filters: {},
  rowSelection: {},
  selectAllMatching: false,
  setSelectAllMatching: (selectAllMatching) => set({ selectAllMatching }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder, page: 1 }),
  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
      page: 1,
      rowSelection: {},
      selectAllMatching: false,
    })),
  clearFilters: () =>
    set({
      filters: {},
      page: 1,
      rowSelection: {},
      selectAllMatching: false,
    }),
  setRowSelection: (rowSelection) =>
    set((state) => ({
      rowSelection,
      // Unticking a row leaves "all matching" mode.
      selectAllMatching:
        state.selectAllMatching &&
        Object.values(rowSelection).filter(Boolean).length >=
          Object.values(state.rowSelection).filter(Boolean).length,
    })),
  clearRowSelection: () => set({ rowSelection: {}, selectAllMatching: false }),
  resetPage: () => set({ page: 1 }),
}));

export function buildLeadsListParams(
  search: string,
  state: Pick<
    LeadsTableState,
    "page" | "limit" | "sortBy" | "sortOrder" | "filters"
  >,
): LeadsListParams {
  return {
    page: state.page,
    limit: state.limit,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    ...buildLeadSelectionFilters(search, state.filters),
  };
}

/** The same filters as the list, for "all matching" bulk actions. */
export function buildLeadSelectionFilters(
  search: string,
  filters: LeadsTableFilters,
): LeadSelectionFilters {
  const trimmedSearch = search.trim();
  const state = { filters };
  const nonEmpty = <T,>(values?: T[]) => (values && values.length > 0 ? values : undefined);
  // A picked day covers the whole local day; a timestamp (dashboard link) is exact.
  const dateBound = (value: string, edge: "start" | "end") =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}${edge === "start" ? "T00:00:00" : "T23:59:59.999"}`).toISOString()
      : new Date(value).toISOString();

  return {
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
    ...(state.filters.id ? { id: state.filters.id } : {}),
    ...(state.filters.pipelineId ? { pipelineId: state.filters.pipelineId } : {}),
    ...(state.filters.stageId ? { stageId: state.filters.stageId } : {}),
    ...(state.filters.sourceId ? { sourceId: state.filters.sourceId } : {}),
    ...(state.filters.assignedUserId
      ? { assignedUserId: state.filters.assignedUserId }
      : {}),
    ...(state.filters.status ? { status: state.filters.status } : {}),
    ...(state.filters.projectId ? { projectId: state.filters.projectId } : {}),
    ...(state.filters.unassignedOnly ? { unassignedOnly: true } : {}),
    ...(state.filters.staleOnly ? { staleOnly: true } : {}),
    ...(filters.openOnly ? { openOnly: true } : {}),
    ...(nonEmpty(filters.assignees) ? { assignees: filters.assignees } : {}),
    ...(nonEmpty(filters.stageIds) ? { stageIds: filters.stageIds } : {}),
    ...(nonEmpty(filters.sourceIds) ? { sourceIds: filters.sourceIds } : {}),
    ...(nonEmpty(filters.heat) ? { heat: filters.heat } : {}),
    ...(filters.interestLevel ? { interestLevel: filters.interestLevel } : {}),
    ...(filters.createdFrom ? { createdFrom: dateBound(filters.createdFrom, "start") } : {}),
    ...(filters.createdTo ? { createdTo: dateBound(filters.createdTo, "end") } : {}),
    ...(filters.closedFrom ? { closedFrom: dateBound(filters.closedFrom, "start") } : {}),
    ...(filters.closedTo ? { closedTo: dateBound(filters.closedTo, "end") } : {}),
    ...(filters.lastContact ? { lastContact: filters.lastContact } : {}),
    ...(filters.nextStep ? { nextStep: filters.nextStep } : {}),
    ...(filters.slaBreached ? { slaBreached: filters.slaBreached } : {}),
    ...(filters.stuck ? { stuck: true } : {}),
    ...(filters.stageStale ? { stageStale: true } : {}),
    ...(filters.assignedOnly ? { assignedOnly: true } : {}),
    ...(filters.unansweredMin ? { unansweredMin: filters.unansweredMin } : {}),
    ...(filters.lostReasonId ? { lostReasonId: filters.lostReasonId } : {}),
    ...(filters.budgetMin !== undefined ? { budgetMin: filters.budgetMin } : {}),
    ...(filters.budgetMax !== undefined ? { budgetMax: filters.budgetMax } : {}),
    ...(nonEmpty(filters.paymentPreferences)
      ? { paymentPreferences: filters.paymentPreferences }
      : {}),
    ...(nonEmpty(filters.contactChannelPreferences)
      ? { contactChannelPreferences: filters.contactChannelPreferences }
      : {}),
    ...(nonEmpty(filters.purchasePurposes) ? { purchasePurposes: filters.purchasePurposes } : {}),
    ...(filters.residenceArea?.trim() ? { residenceArea: filters.residenceArea.trim() } : {}),
    ...(filters.occupation?.trim() ? { occupation: filters.occupation.trim() } : {}),
  };
}

export function hasActiveLeadFilters(filters: LeadsTableFilters): boolean {
  return countActiveLeadFilters(filters) > 0;
}

export function getSelectedLeadIds(selection: RowSelectionState): string[] {
  return Object.entries(selection)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
}
