"use client";

import { create } from "zustand";

interface ExportUiState {
  createDialogOpen: boolean;
  selectedJobId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openJobDetail: (jobId: string) => void;
  closeJobDetail: () => void;
}

export const useExportUiStore = create<ExportUiState>((set) => ({
  createDialogOpen: false,
  selectedJobId: null,
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openJobDetail: (jobId) => set({ selectedJobId: jobId }),
  closeJobDetail: () => set({ selectedJobId: null }),
}));
