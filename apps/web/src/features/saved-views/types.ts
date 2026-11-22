import type { VisibilityState } from "@tanstack/react-table";
import type { LeadsSortField, LeadsTableFilters, LeadsLayout } from "@/features/leads/stores/leads-table-store";
import type { TableDensity } from "@/hooks/use-table-preferences";

export interface SavedViewDisplay {
  layout?: LeadsLayout;
  columns?: VisibilityState;
  density?: TableDensity;
}

export interface SavedView {
  id: string;
  tableKey: string;
  name: string;
  filters: LeadsTableFilters;
  sort: { sortBy?: LeadsSortField; sortOrder?: "asc" | "desc" };
  display: SavedViewDisplay;
  isShared: boolean;
  isOwn: boolean;
  owner: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface SavedViewInput {
  name?: string;
  filters?: LeadsTableFilters;
  sort?: SavedView["sort"];
  display?: SavedViewDisplay;
  isShared?: boolean;
}
