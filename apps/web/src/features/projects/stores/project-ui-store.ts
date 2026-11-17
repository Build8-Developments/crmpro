import { create } from "zustand";

export type ProjectDetailTab = "updates" | "files";

interface ProjectUiState {
  createDialogOpen: boolean;
  editProjectId: string | null;
  deleteProjectId: string | null;
  highlightedProjectId: string | null;
  detailProjectId: string | null;
  detailTab: ProjectDetailTab;
  openDetail: (projectId: string, tab?: ProjectDetailTab) => void;
  closeDetail: () => void;
  setDetailTab: (tab: ProjectDetailTab) => void;
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
  detailProjectId: null,
  detailTab: "updates",
  openDetail: (projectId, tab = "updates") =>
    set({ detailProjectId: projectId, detailTab: tab }),
  closeDetail: () => set({ detailProjectId: null }),
  setDetailTab: (tab) => set({ detailTab: tab }),
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openEditDialog: (projectId) => set({ editProjectId: projectId }),
  closeEditDialog: () => set({ editProjectId: null }),
  openDeleteDialog: (projectId) => set({ deleteProjectId: projectId }),
  closeDeleteDialog: () => set({ deleteProjectId: null }),
  setHighlightedProjectId: (projectId) =>
    set({ highlightedProjectId: projectId }),
}));
