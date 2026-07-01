import { create } from "zustand";

interface UserUiState {
  createDialogOpen: boolean;
  editUserId: string | null;
  changeRoleUserId: string | null;
  resetPasswordUserId: string | null;
  drawerUserId: string | null;
  highlightedUserId: string | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (userId: string) => void;
  closeEditDialog: () => void;
  openChangeRoleDialog: (userId: string) => void;
  closeChangeRoleDialog: () => void;
  openResetPasswordDialog: (userId: string) => void;
  closeResetPasswordDialog: () => void;
  openDrawer: (userId: string) => void;
  closeDrawer: () => void;
  setHighlightedUserId: (userId: string | null) => void;
}

export const useUserUiStore = create<UserUiState>((set) => ({
  createDialogOpen: false,
  editUserId: null,
  changeRoleUserId: null,
  resetPasswordUserId: null,
  drawerUserId: null,
  highlightedUserId: null,
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openEditDialog: (userId) => set({ editUserId: userId }),
  closeEditDialog: () => set({ editUserId: null }),
  openChangeRoleDialog: (userId) => set({ changeRoleUserId: userId }),
  closeChangeRoleDialog: () => set({ changeRoleUserId: null }),
  openResetPasswordDialog: (userId) => set({ resetPasswordUserId: userId }),
  closeResetPasswordDialog: () => set({ resetPasswordUserId: null }),
  openDrawer: (userId) =>
    set({ drawerUserId: userId, highlightedUserId: userId }),
  closeDrawer: () => set({ drawerUserId: null, highlightedUserId: null }),
  setHighlightedUserId: (userId) => set({ highlightedUserId: userId }),
}));
