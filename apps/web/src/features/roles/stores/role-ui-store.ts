import { create } from "zustand";

interface RoleUiState {
  selectedRoleId: string | null;
  createDialogOpen: boolean;
  editRoleId: string | null;
  archiveRoleId: string | null;
  setSelectedRoleId: (roleId: string | null) => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (roleId: string) => void;
  closeEditDialog: () => void;
  openArchiveDialog: (roleId: string) => void;
  closeArchiveDialog: () => void;
}

export const useRoleUiStore = create<RoleUiState>((set) => ({
  selectedRoleId: null,
  createDialogOpen: false,
  editRoleId: null,
  archiveRoleId: null,
  setSelectedRoleId: (roleId) => set({ selectedRoleId: roleId }),
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  openEditDialog: (roleId) => set({ editRoleId: roleId }),
  closeEditDialog: () => set({ editRoleId: null }),
  openArchiveDialog: (roleId) => set({ archiveRoleId: roleId }),
  closeArchiveDialog: () => set({ archiveRoleId: null }),
}));
