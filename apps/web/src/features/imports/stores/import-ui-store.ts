"use client";

import { create } from "zustand";

interface ImportUiState {
  createDialogOpen: boolean;
  /** Bumped on every open so the wizard starts fresh (used as a React key). */
  createDialogSession: number;
  selectedJobId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openJobDetail: (jobId: string) => void;
  closeJobDetail: () => void;
}

export const useImportUiStore = create<ImportUiState>((set) => ({
  createDialogOpen: false,
  createDialogSession: 0,
  selectedJobId: null,
  openCreateDialog: () =>
    set((state) => ({
      createDialogOpen: true,
      createDialogSession: state.createDialogSession + 1,
    })),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openJobDetail: (jobId) => set({ selectedJobId: jobId }),
  closeJobDetail: () => set({ selectedJobId: null }),
}));
