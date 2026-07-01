import { create } from "zustand";

interface FileUiState {
  uploadDialogOpen: boolean;
  deleteFileId: string | null;
  highlightedFileId: string | null;
  openUploadDialog: () => void;
  closeUploadDialog: () => void;
  openDeleteDialog: (fileId: string) => void;
  closeDeleteDialog: () => void;
  setHighlightedFileId: (fileId: string | null) => void;
}

export const useFileUiStore = create<FileUiState>((set) => ({
  uploadDialogOpen: false,
  deleteFileId: null,
  highlightedFileId: null,
  openUploadDialog: () => set({ uploadDialogOpen: true }),
  closeUploadDialog: () => set({ uploadDialogOpen: false }),
  openDeleteDialog: (fileId) => set({ deleteFileId: fileId }),
  closeDeleteDialog: () => set({ deleteFileId: null }),
  setHighlightedFileId: (fileId) => set({ highlightedFileId: fileId }),
}));
