import { create } from "zustand";

interface AuditUiState {
  selectedLogId: string | null;
  openDrawer: (logId: string) => void;
  closeDrawer: () => void;
}

export const useAuditUiStore = create<AuditUiState>((set) => ({
  selectedLogId: null,
  openDrawer: (logId) => set({ selectedLogId: logId }),
  closeDrawer: () => set({ selectedLogId: null }),
}));
