import { create } from "zustand";

interface AssignDialogState {
  leadIds: string[];
}

interface MoveStageDialogState {
  leadIds: string[];
  pipelineId: string;
}

interface EditDialogState {
  leadId: string;
}

interface LeadUiState {
  selectedLeadId: string | null;
  drawerOpen: boolean;
  createDialogOpen: boolean;
  assignDialog: AssignDialogState | null;
  moveStageDialog: MoveStageDialogState | null;
  editDialog: EditDialogState | null;
  openDrawer: (leadId: string) => void;
  closeDrawer: () => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openAssignDialog: (leadIds: string[]) => void;
  openMoveStageDialog: (leadIds: string[], pipelineId: string) => void;
  openEditDialog: (leadId: string) => void;
  closeAssignDialog: () => void;
  closeMoveStageDialog: () => void;
  closeEditDialog: () => void;
}

export const useLeadUiStore = create<LeadUiState>((set) => ({
  selectedLeadId: null,
  drawerOpen: false,
  createDialogOpen: false,
  assignDialog: null,
  moveStageDialog: null,
  editDialog: null,
  openDrawer: (leadId) =>
    set({ selectedLeadId: leadId, drawerOpen: true }),
  closeDrawer: () =>
    set({ drawerOpen: false, selectedLeadId: null }),
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openAssignDialog: (leadIds) =>
    set({ assignDialog: { leadIds } }),
  openMoveStageDialog: (leadIds, pipelineId) =>
    set({ moveStageDialog: { leadIds, pipelineId } }),
  openEditDialog: (leadId) => set({ editDialog: { leadId } }),
  closeAssignDialog: () => set({ assignDialog: null }),
  closeMoveStageDialog: () => set({ moveStageDialog: null }),
  closeEditDialog: () => set({ editDialog: null }),
}));
