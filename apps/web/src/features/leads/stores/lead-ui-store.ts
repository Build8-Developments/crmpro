import { create } from "zustand";
import type {
  InteractionChannel,
  LeadSelectionFilters,
} from "@/features/leads/types";

/** Bulk dialogs act on explicit ids, or on every lead matching `filters`. */
export interface LeadTargets {
  leadIds: string[];
  matching?: { filters: LeadSelectionFilters; count: number };
}

interface MoveStageDialogState extends LeadTargets {
  pipelineId: string;
  /** Pre-selected target (e.g. picked from a menu). */
  stageId?: string;
}

interface EditDialogState {
  leadId: string;
}

export interface LogDialogState {
  leadId: string;
  leadName: string;
  /** Pre-select a channel (e.g. after tapping Call). */
  channel?: InteractionChannel;
  /** The task this log completes, when started from a task. */
  taskId?: string;
}

interface LeadUiState {
  selectedLeadId: string | null;
  drawerOpen: boolean;
  createDialogOpen: boolean;
  assignDialog: LeadTargets | null;
  moveStageDialog: MoveStageDialogState | null;
  editDialog: EditDialogState | null;
  transferDialogOpen: boolean;
  logDialog: LogDialogState | null;
  openDrawer: (leadId: string) => void;
  closeDrawer: () => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openAssignDialog: (leadIds: string[], matching?: LeadTargets["matching"]) => void;
  openMoveStageDialog: (
    leadIds: string[],
    pipelineId: string,
    matching?: LeadTargets["matching"],
    stageId?: string,
  ) => void;
  openEditDialog: (leadId: string) => void;
  openTransferDialog: () => void;
  openLogDialog: (state: LogDialogState) => void;
  closeAssignDialog: () => void;
  closeMoveStageDialog: () => void;
  closeEditDialog: () => void;
  closeTransferDialog: () => void;
  closeLogDialog: () => void;
}

export const useLeadUiStore = create<LeadUiState>((set) => ({
  selectedLeadId: null,
  drawerOpen: false,
  createDialogOpen: false,
  assignDialog: null,
  moveStageDialog: null,
  editDialog: null,
  transferDialogOpen: false,
  logDialog: null,
  openDrawer: (leadId) =>
    set({ selectedLeadId: leadId, drawerOpen: true }),
  closeDrawer: () =>
    set({ drawerOpen: false, selectedLeadId: null }),
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openAssignDialog: (leadIds, matching) =>
    set({ assignDialog: { leadIds, matching } }),
  openMoveStageDialog: (leadIds, pipelineId, matching, stageId) =>
    set({ moveStageDialog: { leadIds, pipelineId, matching, stageId } }),
  openEditDialog: (leadId) => set({ editDialog: { leadId } }),
  openTransferDialog: () => set({ transferDialogOpen: true }),
  openLogDialog: (logDialog) => set({ logDialog }),
  closeAssignDialog: () => set({ assignDialog: null }),
  closeMoveStageDialog: () => set({ moveStageDialog: null }),
  closeEditDialog: () => set({ editDialog: null }),
  closeTransferDialog: () => set({ transferDialogOpen: false }),
  closeLogDialog: () => set({ logDialog: null }),
}));
