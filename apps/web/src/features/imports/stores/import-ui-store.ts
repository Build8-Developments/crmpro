"use client";

import { create } from "zustand";

interface ImportUiState {
  createDialogOpen: boolean;
  selectedJobId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openJobDetail: (jobId: string) => void;
  closeJobDetail: () => void;
}

export const useImportUiStore = create<ImportUiState>((set) => ({
  createDialogOpen: false,
  selectedJobId: null,
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openJobDetail: (jobId) => set({ selectedJobId: jobId }),
  closeJobDetail: () => set({ selectedJobId: null }),
}));
