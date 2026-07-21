import { create } from "zustand";

type ConfirmAction = "deactivate" | "revoke-sessions" | null;

interface AdminUiState {
  createDialogOpen: boolean;
  editAdminId: string | null;
  resetPasswordAdminId: string | null;
  confirmAction: ConfirmAction;
  confirmAdminId: string | null;
  highlightedAdminId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (adminId: string) => void;
  closeEditDialog: () => void;
  openResetPasswordDialog: (adminId: string) => void;
  closeResetPasswordDialog: () => void;
  openConfirmDialog: (action: Exclude<ConfirmAction, null>, adminId: string) => void;
  closeConfirmDialog: () => void;
  setHighlightedAdminId: (adminId: string | null) => void;
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  createDialogOpen: false,
  editAdminId: null,
  resetPasswordAdminId: null,
  confirmAction: null,
  confirmAdminId: null,
  highlightedAdminId: null,
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openEditDialog: (adminId) => set({ editAdminId: adminId }),
  closeEditDialog: () => set({ editAdminId: null }),
  openResetPasswordDialog: (adminId) => set({ resetPasswordAdminId: adminId }),
  closeResetPasswordDialog: () => set({ resetPasswordAdminId: null }),
  openConfirmDialog: (action, adminId) =>
    set({ confirmAction: action, confirmAdminId: adminId }),
  closeConfirmDialog: () =>
    set({ confirmAction: null, confirmAdminId: null }),
  setHighlightedAdminId: (adminId) => set({ highlightedAdminId: adminId }),
}));
