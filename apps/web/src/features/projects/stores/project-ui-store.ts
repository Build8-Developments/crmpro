import { create } from "zustand";

interface ProjectUiState {
  createDialogOpen: boolean;
  editProjectId: string | null;
  deleteProjectId: string | null;
  highlightedProjectId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (projectId: string) => void;
  closeEditDialog: () => void;
  openDeleteDialog: (projectId: string) => void;
  closeDeleteDialog: () => void;
  setHighlightedProjectId: (projectId: string | null) => void;
}

export const useProjectUiStore = create<ProjectUiState>((set) => ({
  createDialogOpen: false,
  editProjectId: null,
  deleteProjectId: null,
  highlightedProjectId: null,
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openEditDialog: (projectId) => set({ editProjectId: projectId }),
  closeEditDialog: () => set({ editProjectId: null }),
  openDeleteDialog: (projectId) => set({ deleteProjectId: projectId }),
  closeDeleteDialog: () => set({ deleteProjectId: null }),
  setHighlightedProjectId: (projectId) =>
    set({ highlightedProjectId: projectId }),
}));
