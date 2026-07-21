import { create } from "zustand";

/**
 * Global UI state (layout chrome only — never server data).
 */
interface UIState {
  /** Desktop sidebar collapsed to icon-only rail. */
  sidebarCollapsed: boolean;
  /** Mobile off-canvas sidebar drawer open. */
  mobileSidebarOpen: boolean;
  /** Command palette dialog open. */
  commandPaletteOpen: boolean;

  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;

  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  openSidebar: () => set({ sidebarCollapsed: false }),
  closeSidebar: () => set({ sidebarCollapsed: true }),

  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}));
