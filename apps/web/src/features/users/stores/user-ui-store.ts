import { create } from "zustand";

export type ConfirmUserActionKind = "deactivate" | "revoke-sessions";

export interface ConfirmUserAction {
  kind: ConfirmUserActionKind;
  userId: string;
  userName: string;
}

interface UserUiState {
  createDialogOpen: boolean;
  inviteDialogOpen: boolean;
  openInviteDialog: () => void;
  closeInviteDialog: () => void;
  editUserId: string | null;
  changeRoleUserId: string | null;
  resetPasswordUserId: string | null;
  drawerUserId: string | null;
  highlightedUserId: string | null;
  confirmAction: ConfirmUserAction | null;
  openConfirmAction: (action: ConfirmUserAction) => void;
  closeConfirmAction: () => void;
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
  inviteDialogOpen: false,
  openInviteDialog: () => set({ inviteDialogOpen: true }),
  closeInviteDialog: () => set({ inviteDialogOpen: false }),
  editUserId: null,
  changeRoleUserId: null,
  resetPasswordUserId: null,
  drawerUserId: null,
  highlightedUserId: null,
  confirmAction: null,
  openConfirmAction: (action) => set({ confirmAction: action }),
  closeConfirmAction: () => set({ confirmAction: null }),
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
