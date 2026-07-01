import { create } from "zustand";

interface DeveloperUiState {
  createDialogOpen: boolean;
  editDeveloperId: string | null;
  deleteDeveloperId: string | null;
  highlightedDeveloperId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (developerId: string) => void;
  closeEditDialog: () => void;
  openDeleteDialog: (developerId: string) => void;
  closeDeleteDialog: () => void;
  setHighlightedDeveloperId: (developerId: string | null) => void;
}

export const useDeveloperUiStore = create<DeveloperUiState>((set) => ({
  createDialogOpen: false,
  editDeveloperId: null,
  deleteDeveloperId: null,
  highlightedDeveloperId: null,
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openEditDialog: (developerId) => set({ editDeveloperId: developerId }),
  closeEditDialog: () => set({ editDeveloperId: null }),
  openDeleteDialog: (developerId) => set({ deleteDeveloperId: developerId }),
  closeDeleteDialog: () => set({ deleteDeveloperId: null }),
  setHighlightedDeveloperId: (developerId) =>
    set({ highlightedDeveloperId: developerId }),
}));
